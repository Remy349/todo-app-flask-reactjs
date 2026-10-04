# FastAPI adapter guide

Targets current FastAPI with Pydantic v2. FastAPI is an **inbound adapter** plus a place to run the composition root at startup. The domain and use cases are the ones from `../idioms.md`; nothing here changes them.

## Contents
1. Detection
2. Where each FastAPI piece goes
3. Inbound adapter
4. Central error mapping
5. Composition root and dependency injection
6. Transactions and request-scoped resources
7. Testing the adapter
8. Async variant
9. Pitfalls

## 1. Detection

`fastapi` in the dependencies; an `app = FastAPI(...)` instance, `APIRouter` modules, `Depends(...)` parameters. Check the Pydantic major version (`pydantic>=2`): v1 syntax (`class Config`, `.dict()`) needs the v1 equivalents.

## 2. Where each FastAPI piece goes

| FastAPI piece | Hexagonal role | Rule |
|---|---|---|
| `APIRouter` and path operations | Inbound adapter | Parse, call one use case, map the result. No business rules, no SQL. |
| Pydantic request/response models | Inbound adapter DTOs | Never passed to use cases or returned from them; map to and from dataclasses. |
| `Depends(...)` | Adapter-side lookup of use cases | Allowed in routers and composition only; never in domain or application code. |
| `@app.exception_handler` | Central error mapping | One module maps error families to Problem Details. |
| `lifespan` | Composition root lifecycle | Create engines and clients on startup, close them on shutdown. |
| `app.state` | Holder of the built use cases | Written once by the composition root, read by dependency providers. |
| Middleware | Cross-cutting edge concerns | Correlation id, CORS, auth, timing. |

## 3. Inbound adapter

Request and response schemas belong to the adapter and include the mapping to the use case input:

```python
# src/shop/orders/adapters/inbound/http/schemas.py
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from shop.orders.application.place_order import PlaceOrderInput, PlaceOrderLine


class OrderLineRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: Annotated[str, Field(min_length=1, max_length=64)]
    quantity: Annotated[int, Field(gt=0, le=1000)]
    unit_price_cents: Annotated[int, Field(ge=0)]


class PlaceOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")  # unknown fields are rejected: no mass assignment

    customer_id: Annotated[str, Field(min_length=1, max_length=64)]
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
    lines: Annotated[list[OrderLineRequest], Field(min_length=1, max_length=100)]

    def to_input(self) -> PlaceOrderInput:
        return PlaceOrderInput(
            customer_id=self.customer_id,
            currency=self.currency,
            lines=tuple(
                PlaceOrderLine(sku=line.sku, quantity=line.quantity, unit_price_cents=line.unit_price_cents)
                for line in self.lines
            ),
        )


class PlaceOrderResponse(BaseModel):
    order_id: str
    total_cents: int
    currency: str
```

Shape validation (types, lengths, formats) happens here. Business rules ("an order needs lines in one currency") stay in the domain, even when a schema constraint happens to overlap.

The router reads use cases through small provider functions. They look the use case up on `app.state`, so the router never imports the composition module or any outbound adapter:

```python
# src/shop/orders/adapters/inbound/http/router.py
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from shop.orders.adapters.inbound.http.schemas import PlaceOrderRequest, PlaceOrderResponse
from shop.orders.application.place_order import PlaceOrder

router = APIRouter(prefix="/orders", tags=["orders"])


def get_place_order(request: Request) -> PlaceOrder:
    return request.app.state.orders.place_order  # type: ignore[no-any-return]


# A sync `def` endpoint runs in FastAPI's thread pool, which suits a sync core and a sync database driver.
@router.post("", status_code=status.HTTP_201_CREATED)
def place_order(
    body: PlaceOrderRequest,
    response: Response,
    use_case: Annotated[PlaceOrder, Depends(get_place_order)],
) -> PlaceOrderResponse:
    output = use_case.execute(body.to_input())
    response.headers["Location"] = f"/orders/{output.order_id}"
    return PlaceOrderResponse(order_id=output.order_id, total_cents=output.total_cents, currency=output.currency)
```

Recipes add endpoints with the same shape: `POST /orders/{order_id}/cancellation` reads `If-Match` with `Header()`, `GET /orders` reads the cursor with `Query()`, and `POST /orders` accepts an `Idempotency-Key` header.

Take identity from authentication, not from the body: in production `customer_id` comes from a dependency that validates the token (for example `Annotated[Principal, Depends(current_principal)]`) and is passed into the use case input.

## 4. Central error mapping

One module, registered once. It maps the error **families** of the shared kernel, so adding a domain error never touches it:

```python
# src/shop/orders/adapters/inbound/http/errors.py
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from shop.shared_kernel.errors import ConflictError, DomainError, NotFoundError

logger = logging.getLogger(__name__)

PROBLEM_JSON = "application/problem+json"


def status_for(error: DomainError) -> int:
    """Map error families, not individual errors: a new domain error needs no change here."""
    if isinstance(error, NotFoundError):
        return 404
    if isinstance(error, ConflictError):
        return 409
    return 422  # any other business rule violation


def problem(status: int, title: str, request: Request, **extra: object) -> JSONResponse:
    body = {"type": "about:blank", "title": title, "status": status, "instance": request.url.path, **extra}
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_JSON)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error(request: Request, exc: DomainError) -> JSONResponse:
        return problem(status_for(exc), exc.message, request, code=exc.code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {"field": ".".join(str(part) for part in error["loc"][1:]), "message": error["msg"]}
            for error in exc.errors()
        ]
        return problem(400, "Request validation failed", request, code="VALIDATION_FAILED", errors=errors)

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error", exc_info=exc)  # logged once, here
        return problem(500, "Internal Server Error", request)
```

Infrastructure errors that deserve their own status (a payment provider that is down → 503) get their own handler; see `../recipes/external-api-acl.md`.

## 5. Composition root and dependency injection

The app factory is the global composition root. It loads settings, opens resources in `lifespan`, builds each context's use cases once, and stores them on `app.state`:

```python
# src/shop/bootstrap/app.py
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from shop.bootstrap.settings import Settings
from shop.orders.adapters.inbound.http.errors import register_error_handlers
from shop.orders.adapters.inbound.http.router import router as orders_router
from shop.orders.composition import build_orders_module


def create_app(settings: Settings) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        app.state.orders = build_orders_module(session_factory=sessionmaker(engine, expire_on_commit=False))
        yield
        engine.dispose()  # graceful shutdown: close pools and clients

    app = FastAPI(title="Shop API", lifespan=lifespan)
    register_error_handlers(app)
    app.include_router(orders_router)
    return app
```

```python
# src/shop/bootstrap/asgi.py
from shop.bootstrap.app import create_app
from shop.bootstrap.settings import Settings

app = create_app(Settings())  # type: ignore[call-arg]  # values come from the environment
```

Why use cases are built once and not per request with `Depends(build_place_order)`: use cases hold no request state (each call opens its own unit of work), so building them once is cheaper and keeps wiring in one place. Build per request only for something genuinely request-scoped, such as the authenticated principal.

`Depends` is FastAPI's injection mechanism for **adapter-level** concerns. Do not use it inside use cases, and do not make the domain or application layer import `fastapi`.

## 6. Transactions and request-scoped resources

The transaction belongs to the use case (its unit of work), not to the request. Avoid the common FastAPI pattern of a `get_db()` dependency that yields a session into the route and commits at the end: it puts the session in the adapter, makes the route the transaction boundary and tempts routes into running queries.

When a request-scoped resource is truly needed (a tenant id, a principal), resolve it with `Depends` in the router and pass it to the use case as plain data.

## 7. Testing the adapter

Build a bare app with the real router and error handlers, and override the provider with a use case wired to fakes. There is no lifespan and no database:

```python
# tests/orders/test_http_adapter.py
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from shop.orders.adapters.inbound.http.errors import register_error_handlers
from shop.orders.adapters.inbound.http.router import get_place_order, router
from shop.orders.application.place_order import PlaceOrder
from tests.support.fakes import FakeUnitOfWork, FixedClock, SequentialIds


@pytest.fixture
def client() -> Iterator[TestClient]:
    place_order = PlaceOrder(uow=FakeUnitOfWork(), ids=SequentialIds(prefix="new"), clock=FixedClock())
    app = FastAPI()
    register_error_handlers(app)
    app.include_router(router)
    app.dependency_overrides[get_place_order] = lambda: place_order

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


def test_post_creates_an_order(client: TestClient) -> None:
    response = client.post(
        "/orders",
        json={"customer_id": "c-1", "currency": "USD", "lines": [{"sku": "A", "quantity": 2, "unit_price_cents": 150}]},
    )

    assert response.status_code == 201
    assert response.headers["Location"] == "/orders/new-1"
    assert response.json() == {"order_id": "new-1", "total_cents": 300, "currency": "USD"}


def test_invalid_body_returns_problem_details_with_field_errors(client: TestClient) -> None:
    response = client.post("/orders", json={"customer_id": "c-1", "currency": "usd", "lines": []})

    assert response.status_code == 400
    assert response.headers["content-type"] == "application/problem+json"
    assert {error["field"] for error in response.json()["errors"]} == {"currency", "lines"}
```

Add one test per mapped error family as endpoints appear: an unknown order returns 404 with `ORDER_NOT_FOUND`, a forbidden transition or stale `If-Match` returns 409, and an unexpected exception returns a generic 500 body.

What these tests prove: request mapping, status codes, headers, Problem Details shape and error mapping. Business rules are covered by use case tests, not here.

`TestClient` needs an HTTP client package installed. Recent Starlette versions warn when that package is `httpx` and suggest its successor; follow the warning your installed version prints. For async tests, `httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")` does the same without threads.

## 8. Async variant

With an async driver, make ports and use cases coroutines and declare endpoints with `async def`:

```python
class PlaceOrder:
    def __init__(self, *, uow: AsyncUnitOfWorkFactory, ids: IdGenerator, clock: Clock) -> None:
        self._uow = uow
        self._ids = ids
        self._clock = clock

    async def execute(self, data: PlaceOrderInput) -> PlaceOrderOutput:
        order = Order.create(...)  # the domain is unchanged and stays synchronous
        async with self._uow() as uow:
            await uow.orders.add(order)
            await uow.commit()
        return PlaceOrderOutput(order_id=order.id, total_cents=order.total.amount, currency=order.total.currency)


@router.post("", status_code=status.HTTP_201_CREATED)
async def place_order(
    body: PlaceOrderRequest,
    response: Response,
    use_case: Annotated[PlaceOrder, Depends(get_place_order)],
) -> PlaceOrderResponse:
    output = await use_case.execute(body.to_input())
    ...
```

Rules: every port on the path is async; no sync I/O inside `async def` (no `requests`, no sync `Session`); the async SQLAlchemy adapter is in `../persistence/sqlalchemy.md`, section 10; test use cases with `@pytest.mark.anyio` and async fakes.

## 9. Pitfalls

- **Pydantic models as domain objects** (or `response_model=OrderRow`): the API contract, validation rules and persistence become one class. Keep three models: schema (adapter), domain, row (adapter).
- **`Depends(get_db)` sessions in routes**: the route becomes the transaction boundary and starts running queries. Keep sessions inside the unit of work.
- **Business logic in dependencies** (`Depends(check_stock)`): dependencies are adapter plumbing; rules belong in the use case.
- **`HTTPException` raised from use cases**: the application layer then knows HTTP. Raise domain errors; map them in `errors.py`.
- **Blocking calls in `async def` endpoints**: use `def` endpoints for a sync core, or make the whole path async.
- **Resources created at import time** (`engine = create_engine(...)` at module level): create them in `lifespan`.
- **Validation errors in FastAPI's default shape** next to Problem Details for other errors: override the `RequestValidationError` handler so clients parse one format.
