<!-- GENERATED from shared/testing-strategy.md by scripts/build.mjs. Edit the source, not this file. -->

# Testing strategy for a hexagonal backend

Hexagonal architecture pays off most in tests. This file is the language-neutral strategy; the concrete tools for this language are in `testing.md`, and framework-specific test clients in `frameworks/`.

The core runs without a database, a web server or the network, so most tests are fast and deterministic. Choose the cheapest test that proves the behavior for each boundary.

## Contents
1. Strategy: what to test where
2. Domain tests
3. Use case tests with fakes
4. Contract tests for ports
5. Inbound adapter tests (HTTP)
6. Outbound adapter integration tests
7. End-to-end tests
8. Architecture tests
9. Fakes vs mocks, and what never to mock
10. Test design rules
11. Testing legacy code while refactoring
12. CI order

## 1. Strategy: what to test where

| Boundary | Test type | Speed | Infrastructure |
|---|---|---|---|
| Domain (entities, value objects, policies) | Pure unit | ms | none |
| Use case | Unit with in-memory fakes of ports | ms | none |
| Port contract (each adapter + the fake) | Shared contract suite | ms to s | fake: none; real: container |
| Inbound adapter (HTTP) | HTTP-level test with a stubbed/fake use case, or the real use case with fakes | ms | none |
| Outbound adapter | Integration test against real tech (DB, broker) | s | container / local service |
| Whole service | End-to-end through real HTTP for critical journeys | s | full stack |
| Dependency rule | Architecture test | ms | none |

Shape: many domain and use case tests, a moderate number of adapter tests, few end-to-end tests. Put the assertions on business outcomes, not on implementation details.

## 2. Domain tests

- No mocks, no framework bootstrapping: construct objects, call behavior, assert state or raised domain errors.
- Cover invariants (invalid creation is rejected), state transitions (allowed and forbidden), and value object equality and validation.
- Property-based tests are a good fit for value objects and calculations.

## 3. Use case tests with fakes

- Provide in-memory implementations of the outbound ports: `InMemoryOrderRepository` (a map), `FakePaymentGateway` (configurable to succeed or fail), `FixedClock`, `SequentialIdGenerator`.
- Arrange with the fakes, act by calling the use case, assert on **outcomes**: the output DTO, what is now stored in the fake repository, which events were published, which error was raised.
- Cover the happy path, each business failure, and each port failure the use case is expected to handle (payment declined, repository conflict).
- Keep one fake per port in a shared test-support module; reuse it in adapter and end-to-end tests.

Example shape (pseudo-code):

```
given a repository containing an unpaid order and a gateway that approves
when PayOrder is executed for that order
then the stored order is marked paid, and the output carries the authorization id

given a gateway that declines
when PayOrder is executed
then a PaymentDeclined error is raised and the stored order remains unpaid
```

## 4. Contract tests for ports

A port has semantics beyond its signature (what `findById` returns when absent, ordering, uniqueness, idempotency). Write the suite **once** against the port and run it against every implementation, including the in-memory fake. This keeps the fake honest and proves Liskov substitution.

```
abstract contract OrderRepositoryContract:
    make_repository() -> OrderRepository      # each implementation supplies this

    test saved order can be found by id
    test find by unknown id returns absent
    test saving the same id twice updates, not duplicates
    test concurrent version conflict raises ConflictError
```

Implementations: `InMemoryOrderRepositoryTest` and `PostgresOrderRepositoryTest` both extend the contract; only `make_repository()` differs.

## 5. Inbound adapter tests (HTTP)

Goal: prove protocol mapping, not business logic.
- Request → use case input mapping (correct fields, types, defaults).
- Validation errors → 400 with field-level Problem Details.
- Each mapped application/domain error → its status code and `code`.
- Success → status, headers (`Location`), body shape, serialization of dates and money.
- Auth: missing or invalid credentials → 401/403; principal propagated.
- Use the framework's in-process test client. Inject a stub or fake use case so the test stays fast.

## 6. Outbound adapter integration tests

- Run against the **real** technology, started with Testcontainers or an ephemeral service. Do not test SQL against an in-memory substitute with different semantics (e.g. SQLite standing in for PostgreSQL).
- Apply the real migrations to the container so schema and mappings are verified together.
- Verify: persistence round-trip (domain → storage → domain equals original), unique/foreign key mapping to application errors, transactions and rollback, pagination and ordering, timeouts and retries for HTTP clients.
- For HTTP/vendor adapters use a local stub server or an HTTP mocking library to simulate success, 4xx, 5xx, slow responses and malformed bodies. Optionally add consumer-driven contract tests (Pact) for critical integrations.
- Isolate data per test (transaction rollback, truncate, unique ids) so tests run in any order and in parallel.

## 7. End-to-end tests

- A handful of critical journeys through the real HTTP endpoint with real infrastructure (`POST /orders` → `GET /orders/{id}` → `POST /orders/{id}/payments`).
- Assert observable behavior only. Keep them stable and few; every extra E2E test is slow and flaky by nature.
- Run against a deployed-like environment (compose stack) in CI; run a smoke subset after each deploy.

## 8. Architecture tests

Encode the dependency rule as an automated test or lint so it cannot silently erode.
- Domain must not depend on application, adapters, or any framework/ORM/HTTP library.
- Application must not depend on adapters or frameworks.
- Inbound adapters must not depend on outbound adapters (and vice versa).
- Only the composition root may reference concrete adapters.
- The tool and a ready-to-use rule set for this language are in `idioms.md`.

## 9. Fakes vs mocks, and what never to mock

- **Prefer fakes** (working in-memory implementations) for ports you own. They survive refactoring because tests assert outcomes instead of call sequences.
- Use **mocks/spies** sparingly to verify a required interaction that has no observable outcome (a notification was sent exactly once). Do not assert internal call order.
- **Do not mock types you do not own** (an ORM session, an HTTP client, a vendor SDK). Wrap them in a port you own, then fake the port and integration-test the adapter.
- Do not mock the domain: use real entities and value objects.
- Freeze time and randomness with an injected clock and id generator.

## 10. Test design rules

- **Structure**: Arrange-Act-Assert or Given-When-Then, one behavior per test, one reason to fail.
- **Names describe behavior**: for example "rejects payment when order already paid". Follow the language's test naming style.
- **No logic in tests** (no loops/conditionals that mirror production code). Use parameterized/table-driven tests for input variations.
- **Independent and repeatable**: no shared mutable state, no test ordering dependency, no real clock, no network except in explicitly integration tests.
- **Test data builders / object mothers** create valid defaults and let each test override only the field that matters.
- **Fast feedback**: the unit suite (domain + use case + HTTP adapter) should run in seconds and be the default local command.
- **Coverage is a signal, not a target.** Prioritize rules, edge cases and error paths over line count. Mutation testing is a stronger check for critical logic.
- Test the error paths as carefully as the happy path: invalid input, not found, conflicts, upstream failure, timeout.

## 11. Testing legacy code while refactoring

Before extracting a use case from a fat controller, write **characterization tests** at the HTTP level that record current behavior (status, body, side effects). Refactor behind them; keep them until the new boundary tests cover the same behavior, then delete redundant ones.

## 12. CI order

1. Format check, lint, type check (fail fast, seconds).
2. Unit tests: domain, use cases, inbound adapter tests.
3. Architecture tests.
4. Adapter integration tests with containers.
5. Build image, run end-to-end/smoke tests.
6. Publish coverage and the OpenAPI diff.
