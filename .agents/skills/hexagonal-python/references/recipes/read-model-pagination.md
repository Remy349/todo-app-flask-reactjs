# Recipe: read model with cursor pagination

## Problem

A screen lists a customer's orders, newest first, possibly thousands of them. Loading aggregates to build a list is wasteful, and `OFFSET` pagination gets slower with every page and skips or repeats rows when new orders arrive between requests.

## Use it when / skip it when

- Use when: an endpoint lists or searches; the data can grow; clients page through it.
- Skip cursor pagination when: the list is small and bounded (an admin table of 50 rows); `page`/`page_size` is simpler there. Still keep a maximum page size.

## Design

- **Separate read port.** `OrderQueries` returns `OrderSummary` DTOs shaped for the screen. It never loads `Order` aggregates and never goes through the unit of work (a light form of CQRS).
- **Keyset (seek) pagination.** Order by a unique, stable key: `(placed_at DESC, order_id DESC)`. The next page starts strictly after the last row returned, so inserts do not shift pages.
- **Opaque cursor.** The client receives an encoded position, not raw column values; the format can change without breaking clients. Encoding and decoding are pure application code.
- **One extra row.** Asking the port for `limit + 1` rows tells whether another page exists without a `COUNT(*)`.
- **Bounded input.** The use case clamps `limit` to `MAX_PAGE_SIZE`, whatever the adapter validated.

## Code

```python
# src/shop/orders/application/list_orders.py
from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from shop.shared_kernel.errors import DomainError

MAX_PAGE_SIZE = 100


class InvalidCursorError(DomainError):
    code = "CURSOR_INVALID"


@dataclass(frozen=True, slots=True)
class OrderSummary:
    """Read model: shaped for the screen, not for the aggregate."""

    order_id: str
    status: str
    total_cents: int
    currency: str
    placed_at: datetime


@dataclass(frozen=True, slots=True)
class Position:
    """Keyset position: the sort key of the last row returned (newest first, id breaks ties)."""

    placed_at: datetime
    order_id: str

    def encode(self) -> str:
        raw = f"{self.placed_at.isoformat()}|{self.order_id}".encode()
        return base64.urlsafe_b64encode(raw).decode()

    @classmethod
    def decode(cls, cursor: str) -> Position:
        try:
            placed_at, order_id = base64.urlsafe_b64decode(cursor.encode()).decode().split("|", 1)
            return cls(placed_at=datetime.fromisoformat(placed_at), order_id=order_id)
        except (binascii.Error, UnicodeDecodeError, ValueError) as err:
            raise InvalidCursorError("cursor is malformed") from err


class OrderQueries(Protocol):
    """Read port. Implemented with a direct query; never loads aggregates."""

    def list_for_customer(self, *, customer_id: str, after: Position | None, limit: int) -> list[OrderSummary]:
        """Return up to `limit` summaries ordered by (placed_at desc, order_id desc), strictly after `after`."""
        ...


@dataclass(frozen=True, slots=True)
class ListOrdersInput:
    customer_id: str
    limit: int = 20
    cursor: str | None = None


@dataclass(frozen=True, slots=True)
class OrderPage:
    items: list[OrderSummary]
    next_cursor: str | None


class ListOrders:
    def __init__(self, *, queries: OrderQueries) -> None:
        self._queries = queries

    def execute(self, data: ListOrdersInput) -> OrderPage:
        limit = max(1, min(data.limit, MAX_PAGE_SIZE))
        after = Position.decode(data.cursor) if data.cursor else None
        # Fetch one extra row to know whether another page exists without a COUNT query.
        rows = self._queries.list_for_customer(customer_id=data.customer_id, after=after, limit=limit + 1)
        items = rows[:limit]
        next_cursor = None
        if len(rows) > limit:
            last = items[-1]
            next_cursor = Position(placed_at=last.placed_at, order_id=last.order_id).encode()
        return OrderPage(items=items, next_cursor=next_cursor)
```

The cursor is opaque, not secret. If a cursor must not be forged (for example it encodes a tenant), sign it with an HMAC in the application layer and reject invalid signatures.

## Tests

Fake read port, added to the shared fakes:

```python
# tests/support/fakes.py  (addition)
from shop.orders.application.list_orders import OrderSummary, Position


class InMemoryOrderQueries:
    def __init__(self, summaries_by_customer: dict[str, list[OrderSummary]]) -> None:
        self._summaries = summaries_by_customer

    def list_for_customer(self, *, customer_id: str, after: Position | None, limit: int) -> list[OrderSummary]:
        rows = sorted(
            self._summaries.get(customer_id, []),
            key=lambda s: (s.placed_at, s.order_id),
            reverse=True,
        )
        if after is not None:
            rows = [s for s in rows if (s.placed_at, s.order_id) < (after.placed_at, after.order_id)]
        return rows[:limit]
```

```python
# tests/orders/test_list_orders.py
from datetime import timedelta

import pytest

from shop.orders.application.list_orders import InvalidCursorError, ListOrders, ListOrdersInput, OrderSummary
from tests.orders.builders import NOW
from tests.support.fakes import InMemoryOrderQueries


def summaries(count: int) -> list[OrderSummary]:
    return [
        OrderSummary(
            order_id=f"order-{i}",
            status="pending",
            total_cents=100,
            currency="USD",
            placed_at=NOW + timedelta(minutes=i),
        )
        for i in range(count)
    ]


def test_walks_all_pages_newest_first_without_duplicates() -> None:
    list_orders = ListOrders(queries=InMemoryOrderQueries({"customer-1": summaries(5)}))

    first = list_orders.execute(ListOrdersInput(customer_id="customer-1", limit=2))
    second = list_orders.execute(ListOrdersInput(customer_id="customer-1", limit=2, cursor=first.next_cursor))
    third = list_orders.execute(ListOrdersInput(customer_id="customer-1", limit=2, cursor=second.next_cursor))

    ids = [item.order_id for page in (first, second, third) for item in page.items]
    assert ids == ["order-4", "order-3", "order-2", "order-1", "order-0"]
    assert third.next_cursor is None


def test_page_size_is_capped() -> None:
    list_orders = ListOrders(queries=InMemoryOrderQueries({"customer-1": summaries(150)}))

    page = list_orders.execute(ListOrdersInput(customer_id="customer-1", limit=10_000))

    assert len(page.items) == 100


def test_rejects_a_malformed_cursor() -> None:
    list_orders = ListOrders(queries=InMemoryOrderQueries({}))

    with pytest.raises(InvalidCursorError):
        list_orders.execute(ListOrdersInput(customer_id="customer-1", cursor="not-a-cursor"))
```

The SQL adapter must page correctly across identical timestamps, which only a real database proves:

```python
# tests/orders/test_read_adapter.py
import pytest
from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.queries import SqlAlchemyOrderQueries
from shop.orders.adapters.outbound.sqlalchemy.unit_of_work import SqlAlchemyUnitOfWork
from shop.orders.application.list_orders import Position
from shop.orders.application.place_order import PlaceOrder
from tests.orders.builders import NOW, a_place_order_input
from tests.support.fakes import FixedClock, SequentialIds

pytestmark = pytest.mark.integration


def test_pages_newest_first_across_identical_timestamps(session_factory: sessionmaker[Session]) -> None:
    clock = FixedClock(NOW)
    place_order = PlaceOrder(uow=lambda: SqlAlchemyUnitOfWork(session_factory), ids=SequentialIds(), clock=clock)
    place_order.execute(a_place_order_input())
    place_order.execute(a_place_order_input())  # same placed_at as the first: the id breaks the tie
    clock.advance(minutes=1)
    place_order.execute(a_place_order_input())
    queries = SqlAlchemyOrderQueries(session_factory)

    first = queries.list_for_customer(customer_id="customer-1", after=None, limit=2)
    last = first[-1]
    rest = queries.list_for_customer(
        customer_id="customer-1", after=Position(placed_at=last.placed_at, order_id=last.order_id), limit=2
    )

    assert [summary.order_id for summary in first + rest] == ["order-3", "order-2", "order-1"]
    assert first[0].placed_at == NOW.replace(minute=1)
```

## Wiring

- **Outbound.** `SqlAlchemyOrderQueries` in `../persistence/sqlalchemy.md`, section 7, with an index on `(customer_id, placed_at DESC, id DESC)`.
- **HTTP.** `GET /orders?limit=20&cursor=...` returning `{"items": [...], "next_cursor": "..." | null}`. Validate `limit` at the edge (`Query(ge=1, le=100)` in FastAPI, `request.args.get("limit", default=20, type=int)` in Flask). `InvalidCursorError` is a `DomainError`, so the family mapping returns 422.
- **Security.** Take `customer_id` from the authenticated principal, never from the query string, or any user can list anyone's orders.
- **Composition.** `ListOrders(queries=SqlAlchemyOrderQueries(session_factory))`.
