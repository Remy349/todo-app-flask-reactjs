# Flask adapter guide

Targets Flask 3.x. Flask is an **inbound adapter**; the application factory is the composition root. The domain and use cases are the ones from `../idioms.md`; nothing here changes them.

## Contents
1. Detection
2. Where each Flask piece goes
3. Inbound adapter
4. Central error mapping
5. Composition root: the application factory
6. Transactions and request-scoped resources
7. Testing the adapter
8. Pitfalls

## 1. Detection

`flask` in the dependencies; `Flask(__name__)`, `Blueprint`, `@app.route` / `@bp.post`. Common companions: `flask-sqlalchemy` (persistence), `marshmallow` or `pydantic` (validation), `flask-smorest` or `apiflask` (OpenAPI). Keep the companions the project already uses.

## 2. Where each Flask piece goes

| Flask piece | Hexagonal role | Rule |
|---|---|---|
| Blueprint and view functions | Inbound adapter | Parse, call one use case, map the result. No rules, no SQL. |
| Pydantic / marshmallow schemas | Inbound adapter DTOs | Validate request shape; map to use case dataclasses. |
| `@app.errorhandler` | Central error mapping | One module maps error families to Problem Details. |
| Application factory `create_app()` | Composition root | Builds adapters and use cases, registers blueprints. |
| `app.config` | Configuration source for the factory | Read once in the factory; never inside use cases. |
| `flask.g`, `current_app`, `request` | Adapter-only context | Never imported by domain or application code. |
| Flask-SQLAlchemy `db.Model` | Persistence model (outbound adapter) | Mapped to the domain in the repository; never returned by use cases. |

## 3. Inbound adapter

Blueprints are created by a factory that **receives the use cases**. No module-level globals, no import of the composition module or of outbound adapters:

```python
# src/shop/orders/adapters/inbound/http/blueprint.py
from dataclasses import asdict

from flask import Blueprint, Response, jsonify, request

from shop.orders.adapters.inbound.http.schemas import PlaceOrderRequest
from shop.orders.application.place_order import PlaceOrder


def create_orders_blueprint(*, place_order: PlaceOrder) -> Blueprint:
    """Use cases are passed in by the app factory: no globals, no imports of outbound adapters."""
    orders = Blueprint("orders", __name__, url_prefix="/orders")

    @orders.post("")
    def place() -> tuple[Response, int, dict[str, str]]:
        body = PlaceOrderRequest.model_validate(request.get_json(silent=True) or {})
        output = place_order.execute(body.to_input())
        return jsonify(asdict(output)), 201, {"Location": f"/orders/{output.order_id}"}

    return orders
```

The request schema is the same Pydantic model as in `fastapi.md`, section 3 (`PlaceOrderRequest` with `extra="forbid"` and `to_input()`), saved as `adapters/inbound/http/schemas.py`. Pydantic is a validation library here, not a framework dependency of the core; marshmallow works the same way (`schema.load(...)` then map to the dataclass).

Recipes add views with the same shape: `request.headers.get("If-Match", type=int)` for optimistic concurrency, `request.args.get("cursor")` for pagination, `request.headers.get("Idempotency-Key")` for idempotent commands.

Take identity from authentication (a decorator or `before_request` hook that validates the token), never from the body, and pass it to the use case as plain data.

## 4. Central error mapping

```python
# src/shop/orders/adapters/inbound/http/errors.py
import logging

from flask import Flask, Response, jsonify, request
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException

from shop.shared_kernel.errors import ConflictError, DomainError, NotFoundError

logger = logging.getLogger(__name__)


def status_for(error: DomainError) -> int:
    """Map error families, not individual errors: a new domain error needs no change here."""
    if isinstance(error, NotFoundError):
        return 404
    if isinstance(error, ConflictError):
        return 409
    return 422


def problem(status: int, title: str, **extra: object) -> tuple[Response, int]:
    response = jsonify(type="about:blank", title=title, status=status, instance=request.path, **extra)
    response.mimetype = "application/problem+json"
    return response, status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(DomainError)
    def domain_error(exc: DomainError) -> tuple[Response, int]:
        return problem(status_for(exc), exc.message, code=exc.code)

    @app.errorhandler(ValidationError)
    def validation_error(exc: ValidationError) -> tuple[Response, int]:
        errors = [{"field": ".".join(str(part) for part in e["loc"]), "message": e["msg"]} for e in exc.errors()]
        return problem(400, "Request validation failed", code="VALIDATION_FAILED", errors=errors)

    @app.errorhandler(HTTPException)
    def http_error(exc: HTTPException) -> tuple[Response, int]:
        return problem(exc.code or 500, exc.name)  # unknown route, wrong method, body too large

    @app.errorhandler(Exception)
    def unexpected(exc: Exception) -> tuple[Response, int]:
        logger.exception("unhandled error", exc_info=exc)  # logged once, here
        return problem(500, "Internal Server Error")
```

Flask dispatches to the handler registered for the most specific class in the exception's hierarchy. Without the `HTTPException` handler, the catch-all `Exception` handler would also receive Flask's own 404, 405 and 413 errors and turn them into 500s.

## 5. Composition root: the application factory

```python
# src/shop/bootstrap/app.py
import atexit

from flask import Flask
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from shop.bootstrap.settings import Settings
from shop.orders.adapters.inbound.http.blueprint import create_orders_blueprint
from shop.orders.adapters.inbound.http.errors import register_error_handlers
from shop.orders.composition import OrdersModule, build_orders_module


def create_app(settings: Settings | None = None, *, orders: OrdersModule | None = None) -> Flask:
    """Application factory = composition root. Tests pass `orders` built from fakes."""
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # body size limit

    if orders is None:
        if settings is None:
            settings = Settings()  # type: ignore[call-arg]  # values come from the environment
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        atexit.register(engine.dispose)
        orders = build_orders_module(session_factory=sessionmaker(engine, expire_on_commit=False))

    register_error_handlers(app)
    app.register_blueprint(create_orders_blueprint(place_order=orders.place_order))
    return app
```

- Use cases are built once and shared across requests and threads: they hold no request state, and each call opens its own unit of work.
- WSGI has no shutdown hook comparable to ASGI `lifespan`; `atexit` covers process exit. Workers managed by Gunicorn can also use its `worker_exit` server hook.
- Run with `flask --app shop.bootstrap.app:create_app run` in development and a WSGI server (Gunicorn, uWSGI) in production.

**With Flask-SQLAlchemy.** Keep `db.Model` classes in `adapters/outbound/sqlalchemy/models.py` and let the unit of work use `db.session` (scoped per app context) or, preferably, a plain `sessionmaker` bound to `db.engine`. Either way the use case still receives a unit-of-work factory and never touches `db`.

## 6. Transactions and request-scoped resources

- The use case's unit of work opens and commits the transaction. Do not commit in `teardown_request` or `after_request`: the view would become the transaction boundary.
- Do not stash sessions, users or tenants in `flask.g` for use cases to read. Resolve them in the view (or a decorator) and pass them as arguments.
- `flask.g` and `current_app` are fine inside the adapter layer for request-scoped plumbing (correlation id, timing).

## 7. Testing the adapter

The factory accepts pre-built use cases, so tests inject fakes and never open a database:

```python
# tests/orders/test_http_adapter.py
import pytest
from flask.testing import FlaskClient

from shop.bootstrap.app import create_app
from shop.orders.application.place_order import PlaceOrder
from shop.orders.composition import OrdersModule
from tests.support.fakes import FakeUnitOfWork, FixedClock, SequentialIds


@pytest.fixture
def client() -> FlaskClient:
    place_order = PlaceOrder(uow=FakeUnitOfWork(), ids=SequentialIds(prefix="new"), clock=FixedClock())
    return create_app(orders=OrdersModule(place_order=place_order)).test_client()


def test_post_creates_an_order(client: FlaskClient) -> None:
    response = client.post(
        "/orders",
        json={"customer_id": "c-1", "currency": "USD", "lines": [{"sku": "A", "quantity": 2, "unit_price_cents": 150}]},
    )

    assert response.status_code == 201
    assert response.headers["Location"] == "/orders/new-1"
    assert response.get_json() == {"order_id": "new-1", "total_cents": 300, "currency": "USD"}


def test_invalid_body_returns_problem_details(client: FlaskClient) -> None:
    response = client.post("/orders", json={"customer_id": "c-1", "currency": "USD", "lines": []})

    assert response.status_code == 400
    assert response.mimetype == "application/problem+json"
    assert response.get_json()["errors"][0]["field"] == "lines"
```

Add one test per mapped error family as endpoints appear (404, 409, 422 and a generic 500).

## 8. Pitfalls

- **Module-level `app = Flask(__name__)` with routes and globals**: wiring at import time makes tests share state. Use the factory.
- **`db.Model` used as the domain entity** (methods with business rules on the model, `db.session.commit()` inside views): move rules into the domain, persistence into a repository, commit into the unit of work.
- **Use cases reading `request`, `g` or `current_app.config`**: pass values in the input dataclass; inject configuration through the composition root.
- **Per-view `try/except` returning ad-hoc JSON errors**: register error handlers once.
- **`jsonify(entity.__dict__)`**: exposes internals and couples the contract to the domain; map to an explicit response.
- **Async views as a performance fix**: Flask runs each async view in its own event loop per request. For an async core, prefer an ASGI framework.
