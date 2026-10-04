# Recipe: idempotent command with an Idempotency-Key

## Problem

A client posts an order, the connection drops before the response arrives, and the client retries. Without protection the retry creates a second order (or a second charge). `POST` is not idempotent by definition, so the API must make it so.

## Use it when / skip it when

- Use when: a command creates something or has an external effect (orders, payments, emails), and clients or gateways retry.
- Skip when: the operation is naturally idempotent (`PUT` with the full resource, `DELETE`, a state transition guarded by the aggregate such as "cancel a pending order").

## Design

- **The client sends `Idempotency-Key`** (a UUID it generates per logical operation) on the `POST`.
- **A decorator wraps the use case** and has the same `execute` signature plus the key. The wrapped `PlaceOrder` stays unaware of idempotency (Open/Closed).
- **Reserve, execute, complete.** The store atomically reserves `(scope, key)` with a fingerprint of the request. The first request executes and stores the response; a retry with the same key and payload gets the stored response; the same key with a different payload is rejected; a retry while the first is still running gets a conflict.
- **Failures release the key** so the client can retry a command that failed.
- **Scope** separates keys per command (`place-order`), so one key cannot collide across endpoints.

## Code

```python
# src/shop/orders/application/idempotency.py
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from typing import Protocol

from shop.orders.application.place_order import PlaceOrder, PlaceOrderInput, PlaceOrderOutput
from shop.shared_kernel.errors import ConflictError, DomainError

StoredResponse = dict[str, str | int]


class IdempotencyKeyReusedError(DomainError):
    code = "IDEMPOTENCY_KEY_REUSED"


@dataclass(frozen=True, slots=True)
class IdempotencyRecord:
    fingerprint: str
    response: StoredResponse | None  # None while the first request is still running


class IdempotencyStore(Protocol):
    def reserve(self, *, scope: str, key: str, fingerprint: str) -> IdempotencyRecord | None:
        """Atomically claim the key. Return None if claimed now, or the existing record if it was already claimed."""
        ...

    def complete(self, *, scope: str, key: str, response: StoredResponse) -> None: ...

    def release(self, *, scope: str, key: str) -> None:
        """Forget a claim whose command failed, so the client can retry."""
        ...


def fingerprint(data: PlaceOrderInput) -> str:
    payload = json.dumps(asdict(data), sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


class IdempotentPlaceOrder:
    """Decorator: same interface as PlaceOrder, replays the stored result for a repeated key."""

    SCOPE = "place-order"

    def __init__(self, *, inner: PlaceOrder, store: IdempotencyStore) -> None:
        self._inner = inner
        self._store = store

    def execute(self, data: PlaceOrderInput, *, idempotency_key: str | None = None) -> PlaceOrderOutput:
        if idempotency_key is None:
            return self._inner.execute(data)

        request_fingerprint = fingerprint(data)
        existing = self._store.reserve(scope=self.SCOPE, key=idempotency_key, fingerprint=request_fingerprint)
        if existing is not None:
            if existing.fingerprint != request_fingerprint:
                raise IdempotencyKeyReusedError("idempotency key was already used with a different request")
            if existing.response is None:
                raise ConflictError("a request with this idempotency key is still in progress")
            return PlaceOrderOutput(
                order_id=str(existing.response["order_id"]),
                total_cents=int(existing.response["total_cents"]),
                currency=str(existing.response["currency"]),
            )

        try:
            output = self._inner.execute(data)
        except Exception:
            self._store.release(scope=self.SCOPE, key=idempotency_key)
            raise
        self._store.complete(scope=self.SCOPE, key=idempotency_key, response=asdict(output))
        return output
```

The fingerprint hashes the use case input, not the raw HTTP body, so formatting differences (key order, whitespace) do not count as a different request.

## Tests

Fake store, added to the shared fakes:

```python
# tests/support/fakes.py  (addition)
from shop.orders.application.idempotency import IdempotencyRecord, StoredResponse


class InMemoryIdempotencyStore:
    def __init__(self) -> None:
        self.records: dict[tuple[str, str], IdempotencyRecord] = {}

    def reserve(self, *, scope: str, key: str, fingerprint: str) -> IdempotencyRecord | None:
        existing = self.records.get((scope, key))
        if existing is None:
            self.records[(scope, key)] = IdempotencyRecord(fingerprint=fingerprint, response=None)
        return existing

    def complete(self, *, scope: str, key: str, response: StoredResponse) -> None:
        self.records[(scope, key)] = IdempotencyRecord(self.records[(scope, key)].fingerprint, response)

    def release(self, *, scope: str, key: str) -> None:
        self.records.pop((scope, key), None)
```

```python
# tests/orders/test_idempotency.py
from dataclasses import replace

import pytest

from shop.orders.application.idempotency import IdempotencyKeyReusedError, IdempotentPlaceOrder, fingerprint
from shop.orders.application.place_order import PlaceOrder
from shop.orders.domain.errors import InvalidOrderError
from shop.shared_kernel.errors import ConflictError
from tests.orders.builders import a_place_order_input
from tests.support.fakes import FakeUnitOfWork, FixedClock, InMemoryIdempotencyStore, SequentialIds


@pytest.fixture
def uow() -> FakeUnitOfWork:
    return FakeUnitOfWork()


@pytest.fixture
def store() -> InMemoryIdempotencyStore:
    return InMemoryIdempotencyStore()


@pytest.fixture
def place_order(uow: FakeUnitOfWork, store: InMemoryIdempotencyStore) -> IdempotentPlaceOrder:
    inner = PlaceOrder(uow=uow, ids=SequentialIds(), clock=FixedClock())
    return IdempotentPlaceOrder(inner=inner, store=store)


def test_a_retry_with_the_same_key_replays_the_first_result(
    place_order: IdempotentPlaceOrder, uow: FakeUnitOfWork
) -> None:
    first = place_order.execute(a_place_order_input(), idempotency_key="key-1")
    retry = place_order.execute(a_place_order_input(), idempotency_key="key-1")

    assert retry == first
    assert len(uow.committed_orders.rows) == 1


def test_the_same_key_with_a_different_payload_is_rejected(place_order: IdempotentPlaceOrder) -> None:
    place_order.execute(a_place_order_input(), idempotency_key="key-1")

    with pytest.raises(IdempotencyKeyReusedError):
        place_order.execute(replace(a_place_order_input(), customer_id="someone-else"), idempotency_key="key-1")


def test_a_concurrent_request_with_the_same_key_is_a_conflict(
    place_order: IdempotentPlaceOrder, store: InMemoryIdempotencyStore
) -> None:
    store.reserve(scope="place-order", key="key-1", fingerprint=fingerprint(a_place_order_input()))

    with pytest.raises(ConflictError):
        place_order.execute(a_place_order_input(), idempotency_key="key-1")


def test_a_failed_command_releases_the_key(place_order: IdempotentPlaceOrder, store: InMemoryIdempotencyStore) -> None:
    with pytest.raises(InvalidOrderError):
        place_order.execute(replace(a_place_order_input(), lines=()), idempotency_key="key-1")

    assert store.records == {}


def test_without_a_key_every_call_places_a_new_order(place_order: IdempotentPlaceOrder, uow: FakeUnitOfWork) -> None:
    place_order.execute(a_place_order_input())
    place_order.execute(a_place_order_input())

    assert len(uow.committed_orders.rows) == 2
```

The SQL store's atomicity comes from a unique constraint, so test it against PostgreSQL:

```python
# tests/orders/test_idempotency_store.py
import pytest
from sqlalchemy.orm import Session, sessionmaker

from shop.orders.adapters.outbound.sqlalchemy.idempotency import SqlAlchemyIdempotencyStore

pytestmark = pytest.mark.integration


def test_a_key_is_reserved_once_then_returns_the_stored_response(session_factory: sessionmaker[Session]) -> None:
    store = SqlAlchemyIdempotencyStore(session_factory)

    assert store.reserve(scope="place-order", key="k-1", fingerprint="f") is None
    in_progress = store.reserve(scope="place-order", key="k-1", fingerprint="f")
    store.complete(scope="place-order", key="k-1", response={"order_id": "order-1"})
    completed = store.reserve(scope="place-order", key="k-1", fingerprint="f")

    assert in_progress is not None and in_progress.response is None
    assert completed is not None and completed.response == {"order_id": "order-1"}


def test_a_released_key_can_be_reserved_again(session_factory: sessionmaker[Session]) -> None:
    store = SqlAlchemyIdempotencyStore(session_factory)
    store.reserve(scope="place-order", key="k-1", fingerprint="f")

    store.release(scope="place-order", key="k-1")

    assert store.reserve(scope="place-order", key="k-1", fingerprint="f") is None
```

## Wiring

- **Outbound.** `SqlAlchemyIdempotencyStore` and its table in `../persistence/sqlalchemy.md`, section 7. Expire keys after a documented retention window (for example 24 hours).
- **Composition.** Wrap the plain use case: `IdempotentPlaceOrder(inner=PlaceOrder(...), store=SqlAlchemyIdempotencyStore(session_factory))`, and expose the wrapper to the HTTP adapter.
- **HTTP.** Read the header and pass it through: `idempotency_key: Annotated[str | None, Header(max_length=128)] = None` in FastAPI, `request.headers.get("Idempotency-Key")` in Flask. Replayed responses return the same status and body as the original.
- **Errors.** `IdempotencyKeyReusedError` is a `DomainError` → 422; the "still in progress" `ConflictError` → 409. Both go through the existing family mapping.
- **Stricter APIs** can require the header on every `POST` and return 400 when it is missing.
