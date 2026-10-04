# Recipe: domain events and the transactional outbox

## Problem

When an order is placed, other parts of the system must react: send an email, reserve stock, update a projection in another service. Publishing to a broker inside the request either happens before the commit (the event describes something that may roll back) or after it (a crash in between loses the event).

## Use it when / skip it when

- Use when: another bounded context or service must learn about a change reliably; you need an audit trail of business facts.
- Skip when: the side effect is local and can run in the same transaction, or losing an occasional notification is acceptable. Do not add a broker for a single in-process listener.

## Design

1. **The aggregate records domain events** as it changes (`OrderPlaced`, `OrderPaid`, `OrderCancelled`). The base `Order` in `../idioms.md` already does this; `pull_events()` hands them over once.
2. **The use case writes events to an outbox** through a port, inside the same unit of work as the aggregate. Commit stores both or neither.
3. **The adapter translates domain events into integration events**: explicit, versioned payloads (the published language). Domain events can change freely; integration events are a contract.
4. **A relay publishes** unpublished outbox rows to the broker and marks them published. Delivery is at-least-once.
5. **Consumers are idempotent**: they record processed message ids and skip duplicates.

## Code

The domain events (already part of the base slice):

```python
# src/shop/orders/domain/events.py
from dataclasses import dataclass
from datetime import datetime

from shop.orders.domain.money import Money


@dataclass(frozen=True, slots=True, kw_only=True)
class DomainEvent:
    occurred_at: datetime


@dataclass(frozen=True, slots=True, kw_only=True)
class OrderPlaced(DomainEvent):
    order_id: str
    customer_id: str
    total: Money


@dataclass(frozen=True, slots=True, kw_only=True)
class OrderPaid(DomainEvent):
    order_id: str
    payment_id: str


@dataclass(frozen=True, slots=True, kw_only=True)
class OrderCancelled(DomainEvent):
    order_id: str
    reason: str
```

The outbox port joins the unit of work, so it shares its transaction:

```python
# src/shop/orders/application/ports.py
from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from types import TracebackType
from typing import Protocol, Self

from shop.orders.domain.events import DomainEvent
from shop.orders.domain.order import Order, OrderId


class OrderRepository(Protocol):
    def get(self, order_id: OrderId) -> Order | None: ...

    def add(self, order: Order) -> None:
        """Insert a new order. Raises ConflictError if the id already exists."""
        ...

    def update(self, order: Order) -> None:
        """Persist changes. Raises ConflictError if the stored version is not `order.version`."""
        ...


class Outbox(Protocol):
    def add(self, events: Sequence[DomainEvent]) -> None: ...


class UnitOfWork(Protocol):
    """One transaction. Leaving the block without `commit()` rolls back."""

    @property
    def orders(self) -> OrderRepository: ...

    @property
    def outbox(self) -> Outbox: ...

    def __enter__(self) -> Self: ...

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None: ...

    def commit(self) -> None: ...


class UnitOfWorkFactory(Protocol):
    def __call__(self) -> UnitOfWork: ...


class IdGenerator(Protocol):
    def new_id(self) -> str: ...


class Clock(Protocol):
    def now(self) -> datetime: ...
```

Every use case that changes an aggregate adds its events before committing. `PlaceOrder` becomes:

```python
# src/shop/orders/application/place_order.py
from dataclasses import dataclass

from shop.orders.application.ports import Clock, IdGenerator, UnitOfWorkFactory
from shop.orders.domain.money import Money
from shop.orders.domain.order import Order, OrderId, OrderLine


@dataclass(frozen=True, slots=True)
class PlaceOrderLine:
    sku: str
    quantity: int
    unit_price_cents: int


@dataclass(frozen=True, slots=True)
class PlaceOrderInput:
    customer_id: str
    currency: str
    lines: tuple[PlaceOrderLine, ...]


@dataclass(frozen=True, slots=True)
class PlaceOrderOutput:
    order_id: str
    total_cents: int
    currency: str


class PlaceOrder:
    def __init__(self, *, uow: UnitOfWorkFactory, ids: IdGenerator, clock: Clock) -> None:
        self._uow = uow
        self._ids = ids
        self._clock = clock

    def execute(self, data: PlaceOrderInput) -> PlaceOrderOutput:
        order = Order.create(
            id=OrderId(self._ids.new_id()),
            customer_id=data.customer_id,
            lines=[
                OrderLine(sku=line.sku, quantity=line.quantity, unit_price=Money(line.unit_price_cents, data.currency))
                for line in data.lines
            ],
            now=self._clock.now(),
        )
        with self._uow() as uow:
            uow.orders.add(order)
            uow.outbox.add(order.pull_events())
            uow.commit()
        return PlaceOrderOutput(order_id=order.id, total_cents=order.total.amount, currency=order.total.currency)
```

Add the same line, `uow.outbox.add(order.pull_events())`, before `uow.commit()` in `CancelOrder`, `PayOrder` and any other command.

The translation to integration events lives in the outbound adapter layer:

```python
# src/shop/orders/adapters/outbound/integration_events.py
from shop.orders.domain.events import DomainEvent, OrderCancelled, OrderPaid, OrderPlaced

IntegrationEvent = tuple[str, dict[str, object]]


def to_integration_event(event: DomainEvent) -> IntegrationEvent:
    """Published language: explicit, versioned payloads. Changing a domain event must not break consumers."""
    match event:
        case OrderPlaced():
            return "orders.order_placed.v1", {
                "orderId": event.order_id,
                "customerId": event.customer_id,
                "totalCents": event.total.amount,
                "currency": event.total.currency,
                "occurredAt": event.occurred_at.isoformat(),
            }
        case OrderPaid():
            return "orders.order_paid.v1", {
                "orderId": event.order_id,
                "paymentId": event.payment_id,
                "occurredAt": event.occurred_at.isoformat(),
            }
        case OrderCancelled():
            return "orders.order_cancelled.v1", {
                "orderId": event.order_id,
                "reason": event.reason,
                "occurredAt": event.occurred_at.isoformat(),
            }
        case _:
            raise ValueError(f"no integration event for {type(event).__name__}")
```

The SQLAlchemy outbox table, the outbox adapter and the relay are in `../persistence/sqlalchemy.md`, section 7. Add `self.outbox = SqlAlchemyOutbox(self._session)` to the unit of work's `__enter__`.

## Tests

The fake unit of work gains an outbox that, like the real one, only keeps events of committed transactions:

```python
# tests/support/fakes.py  (addition)
from collections.abc import Sequence

from shop.orders.domain.events import DomainEvent


class InMemoryOutbox:
    def __init__(self) -> None:
        self.events: list[DomainEvent] = []

    def add(self, events: Sequence[DomainEvent]) -> None:
        self.events.extend(events)


class FakeUnitOfWork:
    """Stages writes and applies them only on commit, like a real transaction."""

    def __init__(self, orders: InMemoryOrderRepository | None = None, outbox: InMemoryOutbox | None = None) -> None:
        self.committed_orders = orders or InMemoryOrderRepository()
        self.committed_outbox = outbox or InMemoryOutbox()
        self.commits = 0

    def __call__(self) -> Self:  # acts as its own UnitOfWorkFactory
        return self

    def __enter__(self) -> Self:
        self.orders = copy.deepcopy(self.committed_orders)
        self.outbox = InMemoryOutbox()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        pass  # uncommitted staging copies are simply dropped

    def commit(self) -> None:
        self.committed_orders.rows = self.orders.rows
        self.committed_outbox.events.extend(self.outbox.events)
        self.commits += 1
```

`FakeUnitOfWork` replaces the version in `../testing.md`.

Use case tests assert on the committed outbox:

```python
# tests/orders/test_place_order.py  (addition)
from shop.orders.domain.events import OrderPlaced
from tests.orders.builders import a_place_order_input


def test_stores_order_placed_in_the_outbox_in_the_same_transaction(
    place_order: PlaceOrder, uow: FakeUnitOfWork
) -> None:
    place_order.execute(a_place_order_input())

    assert [type(event) for event in uow.committed_outbox.events] == [OrderPlaced]
```

Adapter tests (PostgreSQL in a container) prove atomicity and relay behavior:

```python
# tests/orders/test_outbox_adapters.py
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.models import OutboxRow
from shop.orders.adapters.outbound.sqlalchemy.relay import OutboxRelay
from shop.orders.adapters.outbound.sqlalchemy.unit_of_work import SqlAlchemyUnitOfWork
from shop.orders.application.place_order import PlaceOrder
from tests.orders.builders import a_place_order_input
from tests.support.fakes import FixedClock, SequentialIds

pytestmark = pytest.mark.integration


class RecordingPublisher:
    def __init__(self) -> None:
        self.published: list[tuple[str, str]] = []

    def publish(self, *, message_id: str, event_type: str, payload: dict[str, object]) -> None:
        self.published.append((message_id, event_type))


def place_order(session_factory: sessionmaker[Session]) -> PlaceOrder:
    return PlaceOrder(uow=lambda: SqlAlchemyUnitOfWork(session_factory), ids=SequentialIds(), clock=FixedClock())


def test_order_and_integration_event_are_committed_together(session_factory: sessionmaker[Session]) -> None:
    place_order(session_factory).execute(a_place_order_input())

    with session_factory() as session:
        rows = session.scalars(select(OutboxRow)).all()
    assert [(row.event_type, row.payload["totalCents"]) for row in rows] == [("orders.order_placed.v1", 3000)]


def test_relay_publishes_each_pending_message_once(session_factory: sessionmaker[Session]) -> None:
    place_order(session_factory).execute(a_place_order_input())
    publisher = RecordingPublisher()
    relay = OutboxRelay(session_factory=session_factory, publisher=publisher)

    assert relay.publish_pending() == 1
    assert relay.publish_pending() == 0
    assert [event_type for _, event_type in publisher.published] == ["orders.order_placed.v1"]
```

## Wiring

- **Relay process.** Run `OutboxRelay.publish_pending()` in a loop or on a schedule in a separate worker (a CLI entry point, a container sidecar, a scheduled job). It is an inbound adapter driven by time, not by HTTP.
- **Publisher.** Implement `MessagePublisher` for your broker (RabbitMQ, Kafka, SNS/SQS, Redis Streams). Pass `message_id` as the broker's message id or a header so consumers can deduplicate.
- **Consumers.** In the consuming context, the message handler is an inbound adapter: check a `processed_messages` table (unique on `message_id`) inside the same transaction as the handler's changes, and skip if present.
- **Retention.** Delete published outbox rows after a retention window with a scheduled job.
