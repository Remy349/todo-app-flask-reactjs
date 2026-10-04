# SQLAlchemy persistence adapter guide

Targets SQLAlchemy 2.x with the typed ORM (`DeclarativeBase`, `Mapped`, `mapped_column`, `select()`), sync `Session` by default and `AsyncSession` for async services (section 10). The domain classes in `../idioms.md` stay free of SQLAlchemy.

SQLAlchemy is a **Data Mapper**: persistence classes are separate from the domain, and this adapter maps between them explicitly. Flask-SQLAlchemy's `db.Model` is the same ORM with a Flask-scoped session; the rules below apply unchanged (see `../frameworks/flask.md`).

## Contents
1. Detection
2. Persistence models and mappers
3. Repository adapter
4. Unit of Work
5. Error translation
6. Optimistic concurrency
7. Outbox, read queries and idempotency tables
8. Integration tests
9. Migrations
10. Async variant
11. Pitfalls

## 1. Detection

`sqlalchemy` (and optionally `alembic`, `flask-sqlalchemy`, `psycopg`/`asyncpg`) in the dependencies. Check the major version: `select(...)` + `Session.execute` / `scalars` is 2.x style; `session.query(...)` is legacy 1.x style. Write new code in 2.x style and leave existing code as it is unless the task is a migration.

## 2. Persistence models and mappers

Persistence models live only in the adapter package. They describe tables, not business rules.

```python
# src/shop/orders/adapters/outbound/sqlalchemy/models.py
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class OrderRow(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16))
    currency: Mapped[str] = mapped_column(String(3))
    total_cents: Mapped[int] = mapped_column(Integer)  # denormalized for read queries
    placed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payment_id: Mapped[str | None] = mapped_column(String(64))
    version: Mapped[int] = mapped_column(Integer)
    lines: Mapped[list["OrderLineRow"]] = relationship(
        cascade="all, delete-orphan", order_by="OrderLineRow.position", lazy="selectin"
    )


class OrderLineRow(Base):
    __tablename__ = "order_lines"

    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(64))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_cents: Mapped[int] = mapped_column(Integer)
```

Mapping is explicit, in both directions, in one module. `rehydrate` rebuilds the aggregate without re-running creation rules. `lazy="selectin"` loads lines eagerly, so no lazy load can happen after the session closes.

```python
# src/shop/orders/adapters/outbound/sqlalchemy/mappers.py
from shop.orders.adapters.outbound.sqlalchemy.models import OrderLineRow, OrderRow
from shop.orders.domain.money import Money
from shop.orders.domain.order import Order, OrderId, OrderLine, OrderStatus


def to_domain(row: OrderRow) -> Order:
    return Order.rehydrate(
        id=OrderId(row.id),
        customer_id=row.customer_id,
        lines=[
            OrderLine(sku=line.sku, quantity=line.quantity, unit_price=Money(line.unit_price_cents, row.currency))
            for line in row.lines
        ],
        status=OrderStatus(row.status),
        placed_at=row.placed_at,
        version=row.version,
        payment_id=row.payment_id,
    )


def to_row(order: Order) -> OrderRow:
    return OrderRow(
        id=order.id,
        customer_id=order.customer_id,
        status=order.status.value,
        currency=order.total.currency,
        total_cents=order.total.amount,
        placed_at=order.placed_at,
        payment_id=order.payment_id,
        version=order.version + 1,
        lines=[
            OrderLineRow(position=index, sku=line.sku, quantity=line.quantity, unit_price_cents=line.unit_price.amount)
            for index, line in enumerate(order.lines)
        ],
    )
```

The alternative is **imperative mapping** (`registry.map_imperatively(Order, table)`), which persists domain classes directly. It removes the mapper module but lets SQLAlchemy instrument domain objects (lazy loading, identity map, attribute events). Prefer explicit mapping; choose imperative mapping only consciously and consistently for a whole project.

## 3. Repository adapter

One repository per aggregate root. It receives the session from the unit of work, never commits, and returns domain objects only.

```python
# src/shop/orders/adapters/outbound/sqlalchemy/repository.py
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from shop.orders.adapters.outbound.sqlalchemy.mappers import to_domain, to_row
from shop.orders.adapters.outbound.sqlalchemy.models import OrderRow
from shop.orders.domain.order import Order, OrderId
from shop.shared_kernel.errors import ConflictError


class SqlAlchemyOrderRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, order_id: OrderId) -> Order | None:
        row = self._session.scalar(select(OrderRow).where(OrderRow.id == order_id))
        return to_domain(row) if row is not None else None

    def add(self, order: Order) -> None:
        self._session.add(to_row(order))
        try:
            self._session.flush()  # surface constraint violations here, inside the adapter
        except IntegrityError as err:
            raise ConflictError(f"order {order.id} already exists") from err

    def update(self, order: Order) -> None:
        # Compare-and-set on the version column: the row changes only if nobody else changed it first.
        result = self._session.execute(
            update(OrderRow)
            .where(OrderRow.id == order.id, OrderRow.version == order.version)
            .values(status=order.status.value, payment_id=order.payment_id, version=order.version + 1)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:  # type: ignore[attr-defined]
            raise ConflictError(f"order {order.id} was modified concurrently")
```

`update` writes only the fields that can change after creation. When a use case can change lines, update them in the same method (delete and re-insert the line rows, or diff them).

## 4. Unit of Work

The unit of work owns the session and the transaction. A new instance per use case call; the use case receives a factory (`../idioms.md`, section 4).

```python
# src/shop/orders/adapters/outbound/sqlalchemy/unit_of_work.py
from types import TracebackType
from typing import Self

from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.repository import SqlAlchemyOrderRepository


class SqlAlchemyUnitOfWork:
    """One session and one transaction per `with` block. Create a new instance per use case call."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def __enter__(self) -> Self:
        self._session = self._session_factory()
        self.orders = SqlAlchemyOrderRepository(self._session)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self._session.rollback()  # no-op after commit; discards everything otherwise
        self._session.close()

    def commit(self) -> None:
        self._session.commit()
```

Create the session factory once, in the app factory: `sessionmaker(engine, expire_on_commit=False)`. `expire_on_commit=False` keeps loaded values readable after commit without another query.

## 5. Error translation

| Technology error | Translate to | Where |
|---|---|---|
| `IntegrityError` on a unique or primary key | `ConflictError` (or a context-specific subclass) | `add`, after `flush()` |
| Zero rows affected by a versioned `UPDATE` | `ConflictError` | `update` |
| `OperationalError`, `TimeoutError` from the pool | Let it propagate; the central handler returns 503/500 | nowhere |

Always `raise ... from err` so logs keep the original cause. Do not catch `SQLAlchemyError` broadly to return `None` or an empty list.

## 6. Optimistic concurrency

The aggregate carries the `version` it was loaded with. `update` issues `UPDATE ... WHERE id = :id AND version = :loaded_version` and bumps the version; zero affected rows means someone else committed first. The HTTP adapter exposes the version as an `ETag` and accepts `If-Match` (see `../recipes/aggregate-state-machine.md`).

SQLAlchemy's `version_id_col` mapper option does the same for ORM-managed updates. With explicit mapping, the explicit `UPDATE` above is clearer and keeps the rule visible.

## 7. Outbox, read queries and idempotency tables

These adapters back the recipes. They follow the same rules: they live in this package and return application types.

**Outbox** (`../recipes/domain-events-outbox.md`). The outbox adapter writes to the same session as the repository, so the event and the aggregate commit together:

```python
# src/shop/orders/adapters/outbound/sqlalchemy/models.py  (addition)
from sqlalchemy import JSON


class OutboxRow(Base):
    __tablename__ = "outbox"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict[str, object]] = mapped_column(JSON)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
```

```python
# src/shop/orders/adapters/outbound/sqlalchemy/outbox.py
from collections.abc import Sequence

from sqlalchemy.orm import Session

from shop.orders.adapters.outbound.integration_events import to_integration_event
from shop.orders.adapters.outbound.sqlalchemy.models import OutboxRow
from shop.orders.domain.events import DomainEvent


class SqlAlchemyOutbox:
    """Stores events in the same transaction as the aggregate; a relay publishes them after commit."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, events: Sequence[DomainEvent]) -> None:
        for event in events:
            event_type, payload = to_integration_event(event)
            self._session.add(OutboxRow(event_type=event_type, payload=payload, occurred_at=event.occurred_at))
```

The unit of work exposes it next to the repository: in `__enter__`, add `self.outbox = SqlAlchemyOutbox(self._session)`.

The relay runs in a worker process, not in the request path:

```python
# src/shop/orders/adapters/outbound/sqlalchemy/relay.py
from datetime import UTC, datetime
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.models import OutboxRow


class MessagePublisher(Protocol):
    def publish(self, *, message_id: str, event_type: str, payload: dict[str, object]) -> None: ...


class OutboxRelay:
    """At-least-once delivery: consumers deduplicate by message_id."""

    def __init__(self, *, session_factory: sessionmaker[Session], publisher: MessagePublisher, batch_size: int = 100):
        self._session_factory = session_factory
        self._publisher = publisher
        self._batch_size = batch_size

    def publish_pending(self) -> int:
        with self._session_factory() as session, session.begin():
            rows = session.scalars(
                select(OutboxRow)
                .where(OutboxRow.published_at.is_(None))
                .order_by(OutboxRow.id)
                .limit(self._batch_size)
                .with_for_update(skip_locked=True)  # several relays can run in parallel on PostgreSQL
            ).all()
            for row in rows:
                self._publisher.publish(message_id=str(row.id), event_type=row.event_type, payload=row.payload)
                row.published_at = datetime.now(UTC)
            return len(rows)
```

If publishing succeeds and the commit then fails, the batch is published again. That is the at-least-once guarantee; it is why consumers must be idempotent.

**Read queries** (`../recipes/read-model-pagination.md`). Select only the columns the screen needs; no aggregate loading, no unit of work. Keyset pagination on `(placed_at, id)`:

```python
# src/shop/orders/adapters/outbound/sqlalchemy/queries.py
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.models import OrderRow
from shop.orders.application.list_orders import OrderSummary, Position


class SqlAlchemyOrderQueries:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def list_for_customer(self, *, customer_id: str, after: Position | None, limit: int) -> list[OrderSummary]:
        query = (
            select(OrderRow.id, OrderRow.status, OrderRow.total_cents, OrderRow.currency, OrderRow.placed_at)
            .where(OrderRow.customer_id == customer_id)
            .order_by(OrderRow.placed_at.desc(), OrderRow.id.desc())
            .limit(limit)
        )
        if after is not None:
            query = query.where(
                or_(
                    OrderRow.placed_at < after.placed_at,
                    and_(OrderRow.placed_at == after.placed_at, OrderRow.id < after.order_id),
                )
            )
        with self._session_factory() as session:
            return [
                OrderSummary(
                    order_id=r.id,
                    status=r.status,
                    total_cents=r.total_cents,
                    currency=r.currency,
                    placed_at=r.placed_at,
                )
                for r in session.execute(query)
            ]
```

Back the sort with an index on `(customer_id, placed_at DESC, id DESC)`.

**Idempotency keys** (`../recipes/idempotent-command.md`). The unique constraint makes `reserve` atomic across concurrent requests:

```python
# src/shop/orders/adapters/outbound/sqlalchemy/models.py  (addition)
from sqlalchemy import UniqueConstraint


class IdempotencyRow(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("scope", "key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(64))
    key: Mapped[str] = mapped_column(String(128))
    fingerprint: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict[str, str | int] | None] = mapped_column(JSON)
```

```python
# src/shop/orders/adapters/outbound/sqlalchemy/idempotency.py
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.models import IdempotencyRow
from shop.orders.application.idempotency import IdempotencyRecord, StoredResponse


class SqlAlchemyIdempotencyStore:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def reserve(self, *, scope: str, key: str, fingerprint: str) -> IdempotencyRecord | None:
        with self._session_factory() as session:
            try:
                with session.begin():
                    session.add(IdempotencyRow(scope=scope, key=key, fingerprint=fingerprint, response=None))
                return None
            except IntegrityError:
                pass
            row = session.scalars(
                select(IdempotencyRow).where(IdempotencyRow.scope == scope, IdempotencyRow.key == key)
            ).one()
            return IdempotencyRecord(fingerprint=row.fingerprint, response=row.response)

    def complete(self, *, scope: str, key: str, response: StoredResponse) -> None:
        with self._session_factory() as session, session.begin():
            session.execute(
                update(IdempotencyRow)
                .where(IdempotencyRow.scope == scope, IdempotencyRow.key == key)
                .values(response=response)
            )

    def release(self, *, scope: str, key: str) -> None:
        with self._session_factory() as session, session.begin():
            session.execute(delete(IdempotencyRow).where(IdempotencyRow.scope == scope, IdempotencyRow.key == key))
```

Expire old keys with a scheduled `DELETE` (for example after 24 hours) and document the retention window in the API.

## 8. Integration tests

Run the shared contract suite (`../testing.md`, section 5) against PostgreSQL in a container:

```python
# tests/orders/test_sqlalchemy_order_repository.py
from collections.abc import Iterator

import pytest
from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.repository import SqlAlchemyOrderRepository
from shop.orders.adapters.outbound.sqlalchemy.unit_of_work import SqlAlchemyUnitOfWork
from shop.orders.application.ports import OrderRepository
from tests.orders.builders import an_order
from tests.orders.contract_order_repository import OrderRepositoryContract

pytestmark = pytest.mark.integration


class TestSqlAlchemyOrderRepository(OrderRepositoryContract):
    @pytest.fixture(autouse=True)
    def _session(self, session_factory: sessionmaker[Session]) -> Iterator[None]:
        self.session = session_factory()
        yield
        self.session.close()

    def make_repository(self) -> OrderRepository:
        return SqlAlchemyOrderRepository(self.session)


def test_uncommitted_work_is_rolled_back(session_factory: sessionmaker[Session]) -> None:
    with SqlAlchemyUnitOfWork(session_factory) as uow:
        uow.orders.add(an_order(id="order-1"))

    with SqlAlchemyUnitOfWork(session_factory) as uow:
        assert uow.orders.get(an_order(id="order-1").id) is None
```

Also test: round-trip of every field (time zones included), duplicate id → `ConflictError`, stale version → `ConflictError`, and read queries paging across ties in `placed_at`.

## 9. Migrations

- Alembic owns the schema. Generate revisions with `alembic revision --autogenerate`, then **read and edit** them: autogenerate misses renames, data migrations and some constraint changes.
- Point Alembic's `target_metadata` at the adapter's `Base.metadata`.
- Tests apply migrations (`command.upgrade(config, "head")`), never `Base.metadata.create_all()`, so a missing migration fails CI.
- Run migrations as a deployment step, not at application startup.

## 10. Async variant

For FastAPI with an async driver, the structure is identical and every port method becomes a coroutine:

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

engine = create_async_engine("postgresql+asyncpg://...", pool_pre_ping=True)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


class AsyncSqlAlchemyOrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, order_id: OrderId) -> Order | None:
        row = await self._session.scalar(select(OrderRow).where(OrderRow.id == order_id))
        return to_domain(row) if row is not None else None
```

The unit of work implements `__aenter__` / `__aexit__` and `async def commit`; use cases use `async with self._uow() as uow:`. Eager loading (`selectin`) matters even more here: an implicit lazy load in async code raises instead of querying.

## 11. Pitfalls

- **ORM rows escaping the adapter**: returning `OrderRow`, or letting a use case touch `row.lines`, couples the application to the schema and triggers lazy loads after the session closes.
- **Repositories that commit**: the unit of work commits once per use case. A `commit()` inside `add` breaks atomicity with the outbox and other repositories.
- **A global or thread-shared `Session`**: create one per unit of work. `scoped_session` is a Flask-SQLAlchemy convenience, not something use cases should rely on.
- **`session.merge` for updates**: it hides the version check and issues extra queries. Use an explicit versioned `UPDATE`.
- **Business rules in `@validates`, events or hybrid properties**: they belong in the domain.
- **SQLite as a test double for PostgreSQL**: different types, time zones and locking; use a container.
