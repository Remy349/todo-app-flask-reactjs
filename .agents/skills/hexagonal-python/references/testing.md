# Testing a hexagonal Python service

Tooling for this language. The strategy (what to test at each boundary, fakes vs mocks, CI order) is in `testing-strategy.md`; framework test clients are in `frameworks/`.

## Contents
1. Tools
2. Layout and naming
3. Fakes for every port
4. Test data builders
5. Contract suites shared by fakes and real adapters
6. Integration tests with PostgreSQL in a container
7. Outbound HTTP adapters
8. CI commands

## 1. Tools

| Need | Tool |
|---|---|
| Runner, fixtures, parametrization | `pytest` |
| Async tests (async services only) | `anyio` pytest plugin (ships with AnyIO) or `pytest-asyncio` |
| HTTP adapter tests | the framework's test client (see `frameworks/`) |
| Real database | `testcontainers` + your migration tool (Alembic) |
| Outbound HTTP | `httpx.MockTransport` (no extra dependency) or `respx` |
| Properties of value objects | `hypothesis` |
| Architecture | `import-linter` (`idioms.md`, section 8) |
| Mutation testing for critical rules | `mutmut` |

Freeze time with an injected `FixedClock`, not with monkeypatching `datetime`.

## 2. Layout and naming

```
tests/
  conftest.py                  # shared fixtures (engine, session factory)
  support/fakes.py             # one fake per port, reused everywhere
  orders/
    builders.py                # valid defaults for domain objects and inputs
    test_domain.py             # pure domain rules
    test_place_order.py        # use cases with fakes
    contract_order_repository.py
    test_in_memory_order_repository.py
    test_sqlalchemy_order_repository.py
    test_http_adapter.py
```

Test names state behavior: `test_rejects_an_order_without_lines_and_stores_nothing`. One behavior per test; Arrange, Act, Assert separated by blank lines.

## 3. Fakes for every port

Fakes are working in-memory implementations. They satisfy the `Protocol` structurally and behave like the real thing where it matters: the repository copies on read and write so tests cannot share state by accident, and the unit of work applies changes only on commit.

```python
# tests/support/fakes.py
import copy
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from types import TracebackType
from typing import Self

from shop.orders.domain.order import Order, OrderId
from shop.shared_kernel.errors import ConflictError


class InMemoryOrderRepository:
    def __init__(self) -> None:
        self.rows: dict[OrderId, Order] = {}

    def get(self, order_id: OrderId) -> Order | None:
        stored = self.rows.get(order_id)
        return copy.deepcopy(stored) if stored is not None else None  # callers never share state with the store

    def add(self, order: Order) -> None:
        if order.id in self.rows:
            raise ConflictError(f"order {order.id} already exists")
        self._store(order)

    def update(self, order: Order) -> None:
        stored = self.rows.get(order.id)
        if stored is None or stored.version != order.version:
            raise ConflictError(f"order {order.id} was modified concurrently")
        self._store(order)

    def _store(self, order: Order) -> None:
        saved = copy.deepcopy(order)
        saved.version = order.version + 1  # same rule as the SQL adapter
        saved.pull_events()  # like a database, the store keeps state, not pending events
        self.rows[order.id] = saved


class FakeUnitOfWork:
    """Stages writes and applies them only on commit, like a real transaction."""

    def __init__(self, orders: InMemoryOrderRepository | None = None) -> None:
        self.committed_orders = orders or InMemoryOrderRepository()
        self.commits = 0

    def __call__(self) -> Self:  # acts as its own UnitOfWorkFactory
        return self

    def __enter__(self) -> Self:
        self.orders = copy.deepcopy(self.committed_orders)
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
        self.commits += 1


class SequentialIds:
    def __init__(self, prefix: str = "order") -> None:
        self._prefix = prefix
        self._next = 0

    def new_id(self) -> str:
        self._next += 1
        return f"{self._prefix}-{self._next}"


@dataclass
class FixedClock:
    current: datetime = field(default_factory=lambda: datetime(2026, 1, 15, 12, 0, tzinfo=UTC))

    def now(self) -> datetime:
        return self.current

    def advance(self, **delta: float) -> None:
        self.current += timedelta(**delta)
```

Recipes add fakes for their own ports (`InMemoryOutbox`, `FakePaymentGateway`, `InMemoryOrderQueries`, `InMemoryIdempotencyStore`) in the same module.

Use `unittest.mock` only to verify an interaction that has no observable outcome, and never to mock a type you do not own (`Session`, `httpx.Client`): wrap it in a port and fake the port.

## 4. Test data builders

Valid defaults in one place; each test overrides only what it is about.

```python
# tests/orders/builders.py
from datetime import UTC, datetime

from shop.orders.application.place_order import PlaceOrderInput, PlaceOrderLine
from shop.orders.domain.money import Money
from shop.orders.domain.order import Order, OrderId, OrderLine

NOW = datetime(2026, 1, 15, 12, 0, tzinfo=UTC)


def a_line(*, sku: str = "SKU-1", quantity: int = 1, unit_price_cents: int = 1000, currency: str = "USD") -> OrderLine:
    return OrderLine(sku=sku, quantity=quantity, unit_price=Money(unit_price_cents, currency))


def an_order(*, id: str = "order-1", customer_id: str = "customer-1", lines: list[OrderLine] | None = None) -> Order:
    return Order.create(id=OrderId(id), customer_id=customer_id, lines=[a_line()] if lines is None else lines, now=NOW)


def a_place_order_input() -> PlaceOrderInput:
    """Valid defaults; tests change only what matters with dataclasses.replace()."""
    return PlaceOrderInput(
        customer_id="customer-1",
        currency="USD",
        lines=(PlaceOrderLine(sku="SKU-1", quantity=2, unit_price_cents=1500),),
    )
```

## 5. Contract suites shared by fakes and real adapters

A port's contract is more than its signature: what `get` returns for an unknown id, whether `add` rejects duplicates, how stale versions fail. Write it once as a base class; every implementation inherits it and only provides `make_repository`. The file name does not start with `test_`, so pytest collects the suite only through its subclasses.

```python
# tests/orders/contract_order_repository.py
import pytest

from shop.orders.application.ports import OrderRepository
from shop.orders.domain.order import OrderId, OrderStatus
from shop.shared_kernel.errors import ConflictError
from tests.orders.builders import NOW, a_line, an_order


class OrderRepositoryContract:
    def make_repository(self) -> OrderRepository:
        raise NotImplementedError

    def test_saved_order_is_found_by_id_with_the_same_state(self) -> None:
        repository = self.make_repository()
        order = an_order(lines=[a_line(quantity=2), a_line(sku="SKU-2", unit_price_cents=5)])

        repository.add(order)
        found = repository.get(order.id)

        assert found is not None
        assert (found.id, found.customer_id, found.lines, found.status, found.total) == (
            order.id,
            order.customer_id,
            order.lines,
            order.status,
            order.total,
        )
        assert found.placed_at == NOW

    def test_unknown_id_returns_none(self) -> None:
        assert self.make_repository().get(OrderId("missing")) is None

    def test_adding_the_same_id_twice_is_a_conflict(self) -> None:
        repository = self.make_repository()
        repository.add(an_order(id="order-1"))

        with pytest.raises(ConflictError):
            repository.add(an_order(id="order-1"))

    def test_update_persists_the_new_state_and_bumps_the_version(self) -> None:
        repository = self.make_repository()
        repository.add(an_order(id="order-1"))
        order = repository.get(OrderId("order-1"))
        assert order is not None

        order.pay(payment_id="pay-1", now=NOW)
        repository.update(order)

        updated = repository.get(OrderId("order-1"))
        assert updated is not None
        assert (updated.status, updated.payment_id, updated.version) == (OrderStatus.PAID, "pay-1", order.version + 1)

    def test_update_with_a_stale_version_is_a_conflict(self) -> None:
        repository = self.make_repository()
        repository.add(an_order(id="order-1"))
        first = repository.get(OrderId("order-1"))
        second = repository.get(OrderId("order-1"))
        assert first is not None and second is not None

        first.cancel(reason="first writer", now=NOW)
        repository.update(first)
        second.pay(payment_id="pay-1", now=NOW)

        with pytest.raises(ConflictError):
            repository.update(second)
```

```python
# tests/orders/test_in_memory_order_repository.py
from shop.orders.application.ports import OrderRepository
from tests.orders.contract_order_repository import OrderRepositoryContract
from tests.support.fakes import InMemoryOrderRepository


class TestInMemoryOrderRepository(OrderRepositoryContract):
    def make_repository(self) -> OrderRepository:
        return InMemoryOrderRepository()
```

The SQLAlchemy subclass is in `persistence/sqlalchemy.md`, section 8.

## 6. Integration tests with PostgreSQL in a container

Test SQL adapters against the database you run in production. SQLite differs in types, time zones, locking and constraint behavior, so it hides exactly the bugs these tests exist to find.

```python
# tests/conftest.py
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from testcontainers.community.postgres import PostgresContainer  # testcontainers < 4.15: testcontainers.postgres

from shop.orders.adapters.outbound.sqlalchemy.models import Base


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    with PostgresContainer("postgres:17-alpine", driver="psycopg") as postgres:
        url = postgres.get_connection_url()
        config = Config("alembic.ini")
        config.set_main_option("sqlalchemy.url", url)
        command.upgrade(config, "head")  # real migrations, not metadata.create_all()
        engine = create_engine(url)
        yield engine
        engine.dispose()


@pytest.fixture
def session_factory(engine: Engine) -> Iterator[sessionmaker[Session]]:
    yield sessionmaker(engine, expire_on_commit=False)
    tables = ", ".join(table.name for table in Base.metadata.sorted_tables)
    with engine.begin() as connection:  # isolation: every test starts from empty tables
        connection.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
```

- Mark these tests (`@pytest.mark.integration`) so the default local run stays fast, and run them in CI.
- Keep the container per session and clean data per test. Truncation is simpler than rollback tricks because use cases commit their own transactions.
- The `driver` argument selects the SQLAlchemy dialect in the URL (`psycopg` for psycopg 3, `psycopg2` for the older driver). Install the matching package.

## 7. Outbound HTTP adapters

`httpx.MockTransport` runs the real adapter against a scripted server response, with no network and no extra dependency:

```python
def test_402_becomes_payment_declined() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(402, json={"decline_code": "insufficient_funds"}))
    gateway = HttpPaymentGateway(httpx.Client(base_url="https://payments.test", transport=transport))

    with pytest.raises(PaymentDeclinedError, match="insufficient_funds"):
        gateway.authorize(order_id="o", amount=Money(1, "USD"), idempotency_key="o")
```

Cover success, each mapped error status, timeouts and malformed bodies. The full example is in `recipes/external-api-acl.md`.

## 8. CI commands

```bash
ruff check . && ruff format --check .
mypy src tests
lint-imports
pytest -m "not integration"      # domain, use cases, HTTP adapters: seconds
pytest -m integration            # containers
```

Register the marker in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
pythonpath = ["src", "."]
testpaths = ["tests"]
markers = ["integration: needs Docker"]
```
