# Python idioms, layout and the base slice

Targets Python 3.11+ (`StrEnum`, `Self`, `datetime.UTC`). Nothing in this file imports a web framework or an ORM: it is the core every framework guide and recipe builds on.

## Contents
1. Tooling
2. Naming and style
3. Layout
4. Base vertical slice: PlaceOrder
5. Composition root
6. Errors
7. Pitfalls
8. Architecture enforcement

## 1. Tooling

- **Dependency manager**: follow the lockfile (`uv.lock`, `poetry.lock`, `requirements*.txt`). Configuration lives in `pyproject.toml`.
- **Lint and format**: keep what exists. For new projects, `ruff check` + `ruff format` replace `flake8`, `isort` and `black`.
- **Types**: `mypy --strict` or `pyright` in strict mode. Every public function is annotated; ports without annotations defeat the purpose of `Protocol`.
- **Tests**: `pytest`; see `testing.md`.
- **Architecture**: `import-linter` (section 8).
- Use a `src/` layout so tests import the installed package, never a stray path.

## 2. Naming and style

- **PEP 8 / PEP 257**: modules and packages `lower_snake_case`, classes `PascalCase`, functions and variables `snake_case`, constants `UPPER_SNAKE_CASE`, private names with a leading underscore.
- Use cases are **verbs** (`PlaceOrder`, `CancelOrder`) with one `execute` method. Ports are **capabilities** (`OrderRepository`, `PaymentGateway`, `Clock`). Adapters carry the **technology** (`SqlAlchemyOrderRepository`, `HttpPaymentGateway`). Fakes say what they are (`InMemoryOrderRepository`, `FixedClock`).
- Type hints per PEP 604/585: `str | None`, `list[str]`. Accept `collections.abc` types (`Sequence`, `Mapping`) and return concrete ones.
- `@dataclass(frozen=True, slots=True)` for value objects and DTOs; `kw_only=True` when a hierarchy adds fields (events). `NewType` for ids. `StrEnum` for closed sets.
- Money: integer minor units or `Decimal`, never `float`. Time: aware UTC datetimes from an injected clock; never `datetime.utcnow()`.
- No mutable default arguments, no `from x import *`, no bare `except:`. Keep `__init__.py` files empty.
- Absolute imports inside the package. Use `from __future__ import annotations` in modules with forward references.

## 3. Layout

Feature first (bounded context), then layer.

```
src/shop/
  shared_kernel/
    errors.py                 # error families shared by all contexts (tiny, stable)
  orders/                     # bounded context
    domain/
      errors.py
      money.py
      order.py                # aggregate root + value objects
    application/
      ports.py                # outbound ports (Protocols) + unit of work
      place_order.py          # one use case per module: input, output, class
    adapters/
      inbound/http/           # FastAPI router or Flask blueprint, schemas, error handlers
      outbound/
        sqlalchemy/           # models, mappers, repository, unit of work
        system.py             # UUID generator, system clock
    composition.py            # builds this context's use cases from concrete adapters
  catalog/                    # another context, same shape (or a thin slice)
  bootstrap/
    settings.py               # typed settings, validated at startup
    app.py                    # framework app factory: the global composition root
tests/
  support/fakes.py            # in-memory implementations of every port
  orders/                     # domain, use case, adapter and contract tests
```

## 4. Base vertical slice: PlaceOrder

The recipes extend this slice. Domain first: no imports outside the standard library and the shared kernel. The aggregate records domain events as facts; publishing them reliably is the job of `recipes/domain-events-outbox.md`.

```python
# src/shop/shared_kernel/errors.py
class DomainError(Exception):
    """An expected business failure. `code` is stable and part of the API contract."""

    code = "DOMAIN_ERROR"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    code = "NOT_FOUND"


class ConflictError(DomainError):
    """The request conflicts with the current state: duplicate, stale version or forbidden transition."""

    code = "CONFLICT"
```

The HTTP adapter maps these **families** (not-found → 404, conflict → 409, any other `DomainError` → 422), so adding an error to a context never touches the adapter.

```python
# src/shop/orders/domain/errors.py
from shop.shared_kernel.errors import ConflictError, DomainError, NotFoundError


class InvalidMoneyError(DomainError):
    code = "MONEY_INVALID"


class InvalidOrderError(DomainError):
    code = "ORDER_INVALID"


class OrderNotFoundError(NotFoundError):
    code = "ORDER_NOT_FOUND"


class InvalidOrderTransitionError(ConflictError):
    code = "ORDER_INVALID_TRANSITION"


class StaleOrderError(ConflictError):
    code = "ORDER_STALE"
```

```python
# src/shop/orders/domain/money.py
from __future__ import annotations

from dataclasses import dataclass

from shop.orders.domain.errors import InvalidMoneyError


@dataclass(frozen=True, slots=True)
class Money:
    """Amount in minor units (cents) plus an ISO 4217 currency code. Never a float."""

    amount: int
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise InvalidMoneyError("amount must not be negative")
        if len(self.currency) != 3 or not self.currency.isupper():
            raise InvalidMoneyError(f"invalid currency code: {self.currency!r}")

    @classmethod
    def zero(cls, currency: str) -> Money:
        return cls(0, currency)

    def add(self, other: Money) -> Money:
        if other.currency != self.currency:
            raise InvalidMoneyError(f"cannot add {other.currency} to {self.currency}")
        return Money(self.amount + other.amount, self.currency)

    def times(self, quantity: int) -> Money:
        return Money(self.amount * quantity, self.currency)
```

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

```python
# src/shop/orders/domain/order.py
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import NewType

from shop.orders.domain.errors import InvalidOrderError, InvalidOrderTransitionError
from shop.orders.domain.events import DomainEvent, OrderCancelled, OrderPaid, OrderPlaced
from shop.orders.domain.money import Money

OrderId = NewType("OrderId", str)


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    CANCELLED = "cancelled"


@dataclass(frozen=True, slots=True)
class OrderLine:
    sku: str
    quantity: int
    unit_price: Money

    def __post_init__(self) -> None:
        if not self.sku:
            raise InvalidOrderError("sku is required")
        if self.quantity <= 0:
            raise InvalidOrderError("quantity must be positive")

    @property
    def subtotal(self) -> Money:
        return self.unit_price.times(self.quantity)


class Order:
    """Aggregate root. Build it with `create` (applies business rules) or `rehydrate` (loads stored state)."""

    def __init__(
        self,
        *,
        id: OrderId,
        customer_id: str,
        lines: tuple[OrderLine, ...],
        status: OrderStatus,
        placed_at: datetime,
        version: int,
        payment_id: str | None = None,
    ) -> None:
        self.id = id
        self.customer_id = customer_id
        self.lines = lines
        self.status = status
        self.placed_at = placed_at
        self.version = version
        self.payment_id = payment_id
        self._events: list[DomainEvent] = []

    @classmethod
    def create(cls, *, id: OrderId, customer_id: str, lines: Sequence[OrderLine], now: datetime) -> Order:
        if not lines:
            raise InvalidOrderError("an order needs at least one line")
        if len({line.unit_price.currency for line in lines}) > 1:
            raise InvalidOrderError("all lines must use the same currency")
        order = cls(
            id=id,
            customer_id=customer_id,
            lines=tuple(lines),
            status=OrderStatus.PENDING,
            placed_at=now,
            version=0,
        )
        order._record(OrderPlaced(order_id=id, customer_id=customer_id, total=order.total, occurred_at=now))
        return order

    @classmethod
    def rehydrate(
        cls,
        *,
        id: OrderId,
        customer_id: str,
        lines: Sequence[OrderLine],
        status: OrderStatus,
        placed_at: datetime,
        version: int,
        payment_id: str | None,
    ) -> Order:
        return cls(
            id=id,
            customer_id=customer_id,
            lines=tuple(lines),
            status=status,
            placed_at=placed_at,
            version=version,
            payment_id=payment_id,
        )

    @property
    def total(self) -> Money:
        total = Money.zero(self.lines[0].unit_price.currency)
        for line in self.lines:
            total = total.add(line.subtotal)
        return total

    def pay(self, *, payment_id: str, now: datetime) -> None:
        self._ensure_status(OrderStatus.PENDING, action="pay")
        self.status = OrderStatus.PAID
        self.payment_id = payment_id
        self._record(OrderPaid(order_id=self.id, payment_id=payment_id, occurred_at=now))

    def cancel(self, *, reason: str, now: datetime) -> None:
        self._ensure_status(OrderStatus.PENDING, action="cancel")
        self.status = OrderStatus.CANCELLED
        self._record(OrderCancelled(order_id=self.id, reason=reason, occurred_at=now))

    def pull_events(self) -> list[DomainEvent]:
        events, self._events = self._events, []
        return events

    def _ensure_status(self, expected: OrderStatus, *, action: str) -> None:
        if self.status is not expected:
            raise InvalidOrderTransitionError(f"cannot {action} an order that is {self.status}")

    def _record(self, event: DomainEvent) -> None:
        self._events.append(event)

    def __eq__(self, other: object) -> bool:
        return isinstance(other, Order) and other.id == self.id

    def __hash__(self) -> int:
        return hash(self.id)
```

Ports belong to the application layer and speak domain types. The unit of work is a context manager; the use case receives a **factory** so every call gets its own transaction and the use case object can be shared between requests and threads.

```python
# src/shop/orders/application/ports.py
from __future__ import annotations

from datetime import datetime
from types import TracebackType
from typing import Protocol, Self

from shop.orders.domain.order import Order, OrderId


class OrderRepository(Protocol):
    def get(self, order_id: OrderId) -> Order | None: ...

    def add(self, order: Order) -> None:
        """Insert a new order. Raises ConflictError if the id already exists."""
        ...

    def update(self, order: Order) -> None:
        """Persist changes. Raises ConflictError if the stored version is not `order.version`."""
        ...


class UnitOfWork(Protocol):
    """One transaction. Leaving the block without `commit()` rolls back."""

    @property
    def orders(self) -> OrderRepository: ...

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

`orders` is a read-only `@property` in the protocol on purpose: a plain attribute would be invariant for the type checker, and `SqlAlchemyOrderRepository` or `InMemoryOrderRepository` would not satisfy it.

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
            uow.commit()
        return PlaceOrderOutput(order_id=order.id, total_cents=order.total.amount, currency=order.total.currency)
```

The slice is testable now, before any adapter exists. Fakes live in `tests/support/fakes.py` (full versions in `testing.md`):

```python
# tests/orders/test_place_order.py
from dataclasses import replace

import pytest

from shop.orders.application.place_order import PlaceOrder, PlaceOrderInput, PlaceOrderLine, PlaceOrderOutput
from shop.orders.domain.errors import InvalidOrderError
from shop.orders.domain.order import OrderId, OrderStatus
from tests.support.fakes import FakeUnitOfWork, FixedClock, SequentialIds

VALID_INPUT = PlaceOrderInput(
    customer_id="customer-1",
    currency="USD",
    lines=(PlaceOrderLine(sku="SKU-1", quantity=2, unit_price_cents=1500),),
)


@pytest.fixture
def uow() -> FakeUnitOfWork:
    return FakeUnitOfWork()


@pytest.fixture
def place_order(uow: FakeUnitOfWork) -> PlaceOrder:
    return PlaceOrder(uow=uow, ids=SequentialIds(), clock=FixedClock())


def test_places_a_pending_order_and_returns_its_total(place_order: PlaceOrder, uow: FakeUnitOfWork) -> None:
    output = place_order.execute(VALID_INPUT)

    assert output == PlaceOrderOutput(order_id="order-1", total_cents=3000, currency="USD")
    stored = uow.committed_orders.get(OrderId("order-1"))
    assert stored is not None
    assert stored.status is OrderStatus.PENDING
    assert uow.commits == 1


def test_rejects_an_order_without_lines_and_stores_nothing(place_order: PlaceOrder, uow: FakeUnitOfWork) -> None:
    with pytest.raises(InvalidOrderError):
        place_order.execute(replace(VALID_INPUT, lines=()))

    assert uow.committed_orders.rows == {}
    assert uow.commits == 0
```

## 5. Composition root

Small infrastructure adapters for the `IdGenerator` and `Clock` ports:

```python
# src/shop/orders/adapters/outbound/system.py
import uuid
from datetime import UTC, datetime


class UuidIdGenerator:
    def new_id(self) -> str:
        return str(uuid.uuid4())


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)
```

Each context exposes one function that turns infrastructure handles into ready-to-use use cases. It is the only module of the context that imports concrete adapters, and it knows nothing about FastAPI or Flask:

```python
# src/shop/orders/composition.py
from dataclasses import dataclass

from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.unit_of_work import SqlAlchemyUnitOfWork
from shop.orders.adapters.outbound.system import SystemClock, UuidIdGenerator
from shop.orders.application.place_order import PlaceOrder


@dataclass(frozen=True, slots=True)
class OrdersModule:
    """Use cases of the orders context. Built once at startup; each call opens its own unit of work."""

    place_order: PlaceOrder


def build_orders_module(*, session_factory: sessionmaker[Session]) -> OrdersModule:
    def uow() -> SqlAlchemyUnitOfWork:
        return SqlAlchemyUnitOfWork(session_factory)

    return OrdersModule(place_order=PlaceOrder(uow=uow, ids=UuidIdGenerator(), clock=SystemClock()))
```

The framework's app factory (`bootstrap/`) loads settings, creates the engine and HTTP clients, calls `build_*_module` for each context and hands the use cases to the inbound adapters. See `frameworks/fastapi.md` and `frameworks/flask.md`.

Settings are typed and validated once:

```python
# src/shop/bootstrap/settings.py
from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Loaded and validated once at startup; the app refuses to start with invalid config."""

    model_config = SettingsConfigDict(env_prefix="SHOP_", env_file=".env", extra="ignore")

    database_url: str
    payments_base_url: HttpUrl
    payments_api_key: str = Field(repr=False)
    payments_timeout_seconds: float = 5.0
```

`pydantic-settings` is used only in `bootstrap/`. Without it, a frozen dataclass filled from `os.environ` with explicit validation does the same job.

## 6. Errors

- Exceptions are the Python idiom. Every expected business failure is a `DomainError` subclass with a stable `code`; the three families of the shared kernel decide the HTTP status.
- Adapters translate technology errors (`sqlalchemy.exc.IntegrityError`, `httpx.TimeoutException`) into these families or into a dedicated infrastructure error, always with `raise NewError(...) from err`.
- Infrastructure failures that are not business outcomes (provider down) are plain `Exception` subclasses declared next to their port, mapped to 502/503 by the adapter.
- Never catch `Exception` in a use case to return a default value. Let unexpected errors reach the central handler, which logs once and returns a generic 500.

## 7. Pitfalls

- **Circular imports between layers**: depend on `ports.py`; import concrete adapters only in `composition.py`; use `TYPE_CHECKING` for type-only imports.
- **Import-time side effects**: engines, clients and settings created at module import make tests and startup order fragile. Create them in the app factory or `lifespan`.
- **Blocking calls inside `async def`** (sync ORM, `requests`, `time.sleep`) freeze the event loop. Choose sync or async per service.
- **Leaking framework objects inward**: a Pydantic model, `Request`, `flask.g` or `Session` as a use case argument or return value.
- **Returning ORM rows or mutable aggregates from query endpoints**: return frozen DTOs.
- **`float` money, naive datetimes, mutable defaults, shared mutable class attributes.**
- **`utils.py` / `helpers.py` / `services.py` dumping grounds.** Name modules after the concept they hold.

## 8. Architecture enforcement

`import-linter` contracts in `pyproject.toml`, run with `lint-imports` in CI next to ruff, mypy and pytest:

```toml
[tool.importlinter]
root_packages = ["shop"]
include_external_packages = true

[[tool.importlinter.contracts]]
name = "Domain is pure"
type = "forbidden"
source_modules = ["shop.orders.domain"]
forbidden_modules = [
  "shop.orders.application", "shop.orders.adapters", "shop.bootstrap",
  "fastapi", "flask", "sqlalchemy", "pydantic", "httpx",
]

[[tool.importlinter.contracts]]
name = "Application depends only on the domain"
type = "forbidden"
source_modules = ["shop.orders.application"]
forbidden_modules = ["shop.orders.adapters", "shop.bootstrap", "fastapi", "flask", "sqlalchemy", "pydantic", "httpx"]

[[tool.importlinter.contracts]]
name = "Inbound and outbound adapters are independent"
type = "independence"
modules = ["shop.orders.adapters.inbound", "shop.orders.adapters.outbound"]

[[tool.importlinter.contracts]]
name = "Bounded contexts are independent"
type = "independence"
modules = ["shop.orders", "shop.catalog"]
```

`include_external_packages = true` is what lets the contracts forbid third-party packages such as `fastapi`. Add one set of contracts per bounded context.
