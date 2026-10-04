# Recipe: third-party API behind an Anti-Corruption Layer

## Problem

Paying an order requires a payment provider's REST API. Its model (charges, decline codes, lowercase currencies, vendor ids) and its failure modes (timeouts, 5xx, 402) must not leak into the domain, and a retried request must never charge twice.

## Use it when / skip it when

- Use when: integrating any system you do not control (payments, shipping, tax, identity, a legacy service). This is the default for generic subdomains.
- Skip when: never skip the port. For a trivial, stable integration the adapter can be very small, but it still translates.

## Design

- **The port speaks your language.** `PaymentGateway.authorize(order_id, amount: Money, idempotency_key)` returns a `PaymentAuthorization`. No vendor field appears in the application layer.
- **Two kinds of failure.** A declined payment is a business outcome (`PaymentDeclinedError`, a `DomainError` → 422). An unreachable provider is infrastructure (`PaymentUnavailableError`, a plain exception → 503). The use case treats them differently; so does the HTTP adapter.
- **No remote call inside a transaction.** The use case reads and checks in one short transaction, calls the provider with no transaction open, then applies the result in a second transaction guarded by the aggregate's version.
- **Idempotency towards the provider.** The order id is the idempotency key, so a retried `PayOrder` cannot create a second charge.
- **The adapter owns** the base URL, authentication, timeout, request and response shapes, status-code interpretation and error translation.

## Code

Port, result type and errors, in the application layer:

```python
# src/shop/orders/application/payments.py
from dataclasses import dataclass
from typing import Protocol

from shop.orders.domain.money import Money
from shop.shared_kernel.errors import DomainError


class PaymentDeclinedError(DomainError):
    code = "PAYMENT_DECLINED"


class PaymentUnavailableError(Exception):
    """The provider could not be reached. Infrastructure failure, mapped to 503."""


@dataclass(frozen=True, slots=True)
class PaymentAuthorization:
    payment_id: str


class PaymentGateway(Protocol):
    """Our model of payments. Adapters translate the vendor API into this and nothing else."""

    def authorize(self, *, order_id: str, amount: Money, idempotency_key: str) -> PaymentAuthorization:
        """Raises PaymentDeclinedError or PaymentUnavailableError."""
        ...
```

The use case:

```python
# src/shop/orders/application/pay_order.py
from dataclasses import dataclass

from shop.orders.application.payments import PaymentGateway
from shop.orders.application.ports import Clock, UnitOfWorkFactory
from shop.orders.domain.errors import InvalidOrderTransitionError, OrderNotFoundError
from shop.orders.domain.order import OrderId, OrderStatus


@dataclass(frozen=True, slots=True)
class PayOrderInput:
    order_id: str


@dataclass(frozen=True, slots=True)
class PayOrderOutput:
    order_id: str
    payment_id: str


class PayOrder:
    def __init__(self, *, uow: UnitOfWorkFactory, payments: PaymentGateway, clock: Clock) -> None:
        self._uow = uow
        self._payments = payments
        self._clock = clock

    def execute(self, data: PayOrderInput) -> PayOrderOutput:
        order_id = OrderId(data.order_id)

        # 1. Read and check the rule in a short transaction.
        with self._uow() as uow:
            order = uow.orders.get(order_id)
            if order is None:
                raise OrderNotFoundError(f"order {data.order_id} not found")
            if order.status is not OrderStatus.PENDING:
                raise InvalidOrderTransitionError(f"cannot pay an order that is {order.status}")
            amount = order.total

        # 2. Call the remote system outside any database transaction.
        #    The order id is the idempotency key, so a retry never charges twice.
        authorization = self._payments.authorize(order_id=order_id, amount=amount, idempotency_key=order_id)

        # 3. Apply the result in a new transaction; the version check detects concurrent changes.
        with self._uow() as uow:
            order = uow.orders.get(order_id)
            if order is None:
                raise OrderNotFoundError(f"order {data.order_id} not found")
            order.pay(payment_id=authorization.payment_id, now=self._clock.now())
            uow.orders.update(order)
            uow.commit()

        return PayOrderOutput(order_id=order_id, payment_id=authorization.payment_id)
```

If step 3 fails (the order changed meanwhile), the charge exists but the order is not marked paid. Handle that explicitly for your domain: retry `PayOrder` (the idempotency key returns the same charge), or record the authorization and reconcile. Never wrap step 2 in the database transaction to "fix" it.

The adapter, with `httpx`:

```python
# src/shop/orders/adapters/outbound/payments/http_gateway.py
import httpx

from shop.orders.application.payments import (
    PaymentAuthorization,
    PaymentDeclinedError,
    PaymentUnavailableError,
)
from shop.orders.domain.money import Money


class HttpPaymentGateway:
    """Anti-Corruption Layer over the provider's REST API. Vendor fields and errors never leave this class."""

    def __init__(self, client: httpx.Client) -> None:
        self._client = client  # base_url, auth header and timeout are configured in the composition root

    def authorize(self, *, order_id: str, amount: Money, idempotency_key: str) -> PaymentAuthorization:
        try:
            response = self._client.post(
                "/v1/charges",
                json={"amount": amount.amount, "currency": amount.currency.lower(), "reference": order_id},
                headers={"Idempotency-Key": idempotency_key},
            )
        except httpx.TransportError as err:  # connect errors and timeouts
            raise PaymentUnavailableError("payment provider unreachable") from err

        if response.status_code == 402:
            reason = response.json().get("decline_code", "unknown")
            raise PaymentDeclinedError(f"payment declined: {reason}")
        if response.status_code >= 500:
            raise PaymentUnavailableError(f"payment provider failed with {response.status_code}")
        response.raise_for_status()  # any other 4xx is our bug: let it surface as a 500

        body = response.json()
        return PaymentAuthorization(payment_id=body["id"])
```

## Tests

Fake of the port, added to the shared fakes:

```python
# tests/support/fakes.py  (addition)
from shop.orders.application.payments import PaymentAuthorization, PaymentDeclinedError
from shop.orders.domain.money import Money


class FakePaymentGateway:
    def __init__(self, *, decline: bool = False) -> None:
        self.decline = decline
        self.calls: list[tuple[str, Money, str]] = []

    def authorize(self, *, order_id: str, amount: Money, idempotency_key: str) -> PaymentAuthorization:
        self.calls.append((order_id, amount, idempotency_key))
        if self.decline:
            raise PaymentDeclinedError("payment declined: insufficient_funds")
        return PaymentAuthorization(payment_id=f"pay-{order_id}")
```

Use case behavior:

```python
# tests/orders/test_pay_order.py
import pytest

from shop.orders.application.pay_order import PayOrder, PayOrderInput, PayOrderOutput
from shop.orders.application.payments import PaymentDeclinedError
from shop.orders.domain.errors import InvalidOrderTransitionError
from shop.orders.domain.money import Money
from shop.orders.domain.order import OrderId, OrderStatus
from tests.orders.builders import an_order
from tests.support.fakes import FakePaymentGateway, FakeUnitOfWork, FixedClock, InMemoryOrderRepository


def make(gateway: FakePaymentGateway) -> tuple[PayOrder, FakeUnitOfWork]:
    orders = InMemoryOrderRepository()
    orders.add(an_order(id="order-1"))
    uow = FakeUnitOfWork(orders)
    return PayOrder(uow=uow, payments=gateway, clock=FixedClock()), uow


def test_authorizes_the_order_total_and_marks_it_paid() -> None:
    gateway = FakePaymentGateway()
    pay_order, uow = make(gateway)

    output = pay_order.execute(PayOrderInput(order_id="order-1"))

    assert output == PayOrderOutput(order_id="order-1", payment_id="pay-order-1")
    assert gateway.calls == [("order-1", Money(1000, "USD"), "order-1")]
    stored = uow.committed_orders.get(OrderId("order-1"))
    assert stored is not None
    assert stored.status is OrderStatus.PAID


def test_declined_payment_leaves_the_order_pending() -> None:
    pay_order, uow = make(FakePaymentGateway(decline=True))

    with pytest.raises(PaymentDeclinedError):
        pay_order.execute(PayOrderInput(order_id="order-1"))

    stored = uow.committed_orders.get(OrderId("order-1"))
    assert stored is not None
    assert stored.status is OrderStatus.PENDING


def test_does_not_charge_an_order_that_is_already_paid() -> None:
    gateway = FakePaymentGateway()
    pay_order, _ = make(gateway)
    pay_order.execute(PayOrderInput(order_id="order-1"))

    with pytest.raises(InvalidOrderTransitionError):
        pay_order.execute(PayOrderInput(order_id="order-1"))

    assert len(gateway.calls) == 1
```

The adapter against scripted HTTP responses, with no network:

```python
# tests/orders/test_http_payment_gateway.py
from collections.abc import Callable

import httpx
import pytest

from shop.orders.adapters.outbound.payments.http_gateway import HttpPaymentGateway
from shop.orders.application.payments import PaymentAuthorization, PaymentDeclinedError, PaymentUnavailableError
from shop.orders.domain.money import Money


def gateway(transport: httpx.MockTransport) -> HttpPaymentGateway:
    return HttpPaymentGateway(httpx.Client(base_url="https://payments.test", transport=transport))


def test_translates_a_successful_charge() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Idempotency-Key"] == "order-1"
        assert request.read() == b'{"amount":1000,"currency":"usd","reference":"order-1"}'
        return httpx.Response(201, json={"id": "ch_123", "object": "charge", "livemode": False})

    result = gateway(httpx.MockTransport(handler)).authorize(
        order_id="order-1", amount=Money(1000, "USD"), idempotency_key="order-1"
    )

    assert result == PaymentAuthorization(payment_id="ch_123")


def test_402_becomes_payment_declined() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(402, json={"decline_code": "insufficient_funds"}))

    with pytest.raises(PaymentDeclinedError, match="insufficient_funds"):
        gateway(transport).authorize(order_id="o", amount=Money(1, "USD"), idempotency_key="o")


def server_error(request: httpx.Request) -> httpx.Response:
    return httpx.Response(503)


def timeout(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectTimeout("timed out", request=request)


@pytest.mark.parametrize("handler", [server_error, timeout])
def test_provider_failures_become_payment_unavailable(handler: Callable[[httpx.Request], httpx.Response]) -> None:
    with pytest.raises(PaymentUnavailableError):
        gateway(httpx.MockTransport(handler)).authorize(order_id="o", amount=Money(1, "USD"), idempotency_key="o")
```

## Wiring

- **Composition.** Create one `httpx.Client` at startup with `base_url`, the auth header and a timeout from settings; close it on shutdown (`lifespan` in FastAPI, `atexit` in Flask). Pass it to `HttpPaymentGateway`, and the gateway to `PayOrder`.
- **HTTP errors.** `PaymentDeclinedError` is a `DomainError`, so the family mapping returns 422. Add one handler for the infrastructure error:

```python
@app.exception_handler(PaymentUnavailableError)
async def upstream_unavailable(request: Request, exc: PaymentUnavailableError) -> JSONResponse:
    logger.warning("payment provider unavailable", exc_info=exc)
    return problem(503, "Payment provider unavailable", request, code="UPSTREAM_UNAVAILABLE")
```

  In Flask the same handler is `@app.errorhandler(PaymentUnavailableError)` returning `problem(503, ...)`.
- **Resilience.** Retries with backoff for idempotent calls, and a circuit breaker if the provider fails often, belong in the adapter (or a decorator implementing the same port), never in the use case.
