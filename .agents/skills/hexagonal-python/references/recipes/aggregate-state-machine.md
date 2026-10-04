# Recipe: aggregate with a state machine and optimistic concurrency

## Problem

An order moves through states (`pending → paid`, `pending → cancelled`) and some transitions must be impossible (cancel a paid order, pay twice). Two clients may act on the same order at the same time, and the loser must not silently overwrite the winner.

## Use it when / skip it when

- Use when: an entity has a lifecycle with rules about which operations are allowed in which state; concurrent edits are possible (several users, retries, background jobs).
- Skip when: the entity is plain data (use `crud-thin-slice.md`) or updates are last-write-wins by design.

## Design

- **The aggregate owns the transitions.** `Order.pay` and `Order.cancel` (in `../idioms.md`, section 4) check the current state through `_ensure_status` and raise `InvalidOrderTransitionError`, a `ConflictError`, so the HTTP adapter answers 409 without knowing the rule.
- **No setters.** Code outside the aggregate never assigns `status`; it calls an intention-revealing method.
- **Optimistic concurrency** uses the `version` the aggregate was loaded with. The repository updates with `WHERE version = :loaded` and raises `ConflictError` when zero rows change (`../persistence/sqlalchemy.md`, section 6).
- **Client-side precondition.** The client sends the version it saw (`If-Match`); the use case rejects a mismatch with `StaleOrderError` before doing any work.

For larger machines, replace the per-method guards with a transition table so the allowed moves are data you can read and test in one place:

```python
ALLOWED: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.PENDING: frozenset({OrderStatus.PAID, OrderStatus.CANCELLED}),
    OrderStatus.PAID: frozenset(),
    OrderStatus.CANCELLED: frozenset(),
}


def _transition_to(self, target: OrderStatus) -> None:
    if target not in ALLOWED[self.status]:
        raise InvalidOrderTransitionError(f"cannot go from {self.status} to {target}")
    self.status = target
```

## Code

The use case loads, checks the precondition, asks the aggregate to change, and saves. It contains no rule about which states allow cancelling.

```python
# src/shop/orders/application/cancel_order.py
from dataclasses import dataclass

from shop.orders.application.ports import Clock, UnitOfWorkFactory
from shop.orders.domain.errors import OrderNotFoundError, StaleOrderError
from shop.orders.domain.order import OrderId


@dataclass(frozen=True, slots=True)
class CancelOrderInput:
    order_id: str
    reason: str
    expected_version: int | None = None  # from If-Match; None skips the client-side check


class CancelOrder:
    def __init__(self, *, uow: UnitOfWorkFactory, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    def execute(self, data: CancelOrderInput) -> None:
        with self._uow() as uow:
            order = uow.orders.get(OrderId(data.order_id))
            if order is None:
                raise OrderNotFoundError(f"order {data.order_id} not found")
            if data.expected_version is not None and data.expected_version != order.version:
                raise StaleOrderError(f"order {data.order_id} was modified (version {order.version})")
            order.cancel(reason=data.reason, now=self._clock.now())
            uow.orders.update(order)
            uow.commit()
```

## Tests

Domain rules first, with no fakes at all:

```python
# tests/orders/test_domain.py
import pytest

from shop.orders.domain.errors import InvalidMoneyError, InvalidOrderError, InvalidOrderTransitionError
from shop.orders.domain.events import OrderCancelled, OrderPaid, OrderPlaced
from shop.orders.domain.money import Money
from shop.orders.domain.order import OrderStatus
from tests.orders.builders import NOW, a_line, an_order


def test_money_rejects_negative_amounts() -> None:
    with pytest.raises(InvalidMoneyError):
        Money(-1, "USD")


def test_money_refuses_to_add_different_currencies() -> None:
    with pytest.raises(InvalidMoneyError):
        Money(100, "USD").add(Money(100, "EUR"))


def test_order_total_is_the_sum_of_line_subtotals() -> None:
    order = an_order(lines=[a_line(quantity=2, unit_price_cents=1500), a_line(sku="SKU-2", unit_price_cents=250)])

    assert order.total == Money(3250, "USD")


def test_order_needs_at_least_one_line() -> None:
    with pytest.raises(InvalidOrderError):
        an_order(lines=[])


def test_order_lines_must_share_a_currency() -> None:
    with pytest.raises(InvalidOrderError):
        an_order(lines=[a_line(currency="USD"), a_line(currency="EUR")])


def test_new_order_is_pending_and_records_order_placed() -> None:
    order = an_order()

    assert order.status is OrderStatus.PENDING
    assert [type(e) for e in order.pull_events()] == [OrderPlaced]
    assert order.pull_events() == []


def test_pending_order_can_be_paid_once() -> None:
    order = an_order()
    order.pull_events()

    order.pay(payment_id="pay-1", now=NOW)

    assert order.status is OrderStatus.PAID
    assert order.pull_events() == [OrderPaid(order_id="order-1", payment_id="pay-1", occurred_at=NOW)]
    with pytest.raises(InvalidOrderTransitionError):
        order.pay(payment_id="pay-2", now=NOW)


@pytest.mark.parametrize("first", ["pay", "cancel"])
def test_only_pending_orders_can_be_cancelled(first: str) -> None:
    order = an_order()
    if first == "pay":
        order.pay(payment_id="pay-1", now=NOW)
    else:
        order.cancel(reason="changed my mind", now=NOW)

    with pytest.raises(InvalidOrderTransitionError):
        order.cancel(reason="again", now=NOW)


def test_cancel_records_the_reason() -> None:
    order = an_order()
    order.pull_events()

    order.cancel(reason="out of stock", now=NOW)

    assert order.pull_events() == [OrderCancelled(order_id="order-1", reason="out of stock", occurred_at=NOW)]
```

Then the use case with fakes, covering success, not found, stale version and the forbidden transition:

```python
# tests/orders/test_cancel_order.py
import pytest

from shop.orders.application.cancel_order import CancelOrder, CancelOrderInput
from shop.orders.domain.errors import InvalidOrderTransitionError, OrderNotFoundError, StaleOrderError
from shop.orders.domain.order import OrderId, OrderStatus
from tests.orders.builders import NOW, an_order
from tests.support.fakes import FakeUnitOfWork, FixedClock, InMemoryOrderRepository


@pytest.fixture
def uow() -> FakeUnitOfWork:
    orders = InMemoryOrderRepository()
    orders.add(an_order(id="order-1"))  # stored with version 1
    return FakeUnitOfWork(orders)


@pytest.fixture
def cancel_order(uow: FakeUnitOfWork) -> CancelOrder:
    return CancelOrder(uow=uow, clock=FixedClock(NOW))


def test_cancels_a_pending_order(cancel_order: CancelOrder, uow: FakeUnitOfWork) -> None:
    cancel_order.execute(CancelOrderInput(order_id="order-1", reason="changed my mind", expected_version=1))

    stored = uow.committed_orders.get(OrderId("order-1"))
    assert stored is not None
    assert stored.status is OrderStatus.CANCELLED
    assert stored.version == 2


def test_unknown_order_is_not_found(cancel_order: CancelOrder) -> None:
    with pytest.raises(OrderNotFoundError):
        cancel_order.execute(CancelOrderInput(order_id="missing", reason="x"))


def test_stale_version_is_a_conflict(cancel_order: CancelOrder, uow: FakeUnitOfWork) -> None:
    with pytest.raises(StaleOrderError):
        cancel_order.execute(CancelOrderInput(order_id="order-1", reason="x", expected_version=7))

    stored = uow.committed_orders.get(OrderId("order-1"))
    assert stored is not None
    assert stored.status is OrderStatus.PENDING


def test_cannot_cancel_twice(cancel_order: CancelOrder) -> None:
    cancel_order.execute(CancelOrderInput(order_id="order-1", reason="first"))

    with pytest.raises(InvalidOrderTransitionError):
        cancel_order.execute(CancelOrderInput(order_id="order-1", reason="second"))
```

## Wiring

- **HTTP.** `POST /orders/{order_id}/cancellation` with `{"reason": "..."}`; read `If-Match` as an integer (`Annotated[int | None, Header()] = None` in FastAPI, `request.headers.get("If-Match", type=int)` in Flask) and pass it as `expected_version`. Return `204`. On reads, return the version as an `ETag` header so clients can send it back.
- **Errors.** `OrderNotFoundError` → 404, `InvalidOrderTransitionError` and `StaleOrderError` → 409, through the family mapping in `../frameworks/`. No new handler is needed.
- **Composition.** `CancelOrder(uow=uow, clock=SystemClock())` in `composition.py`.
