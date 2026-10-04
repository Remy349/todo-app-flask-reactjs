<!-- GENERATED from shared/solid-patterns.md by scripts/build.mjs. Edit the source, not this file. -->

# SOLID, design patterns and clean code in a hexagonal backend

Principles and patterns are tools, not goals. Use one when the code shows the matching pain. Every example below is described in terms of hexagonal roles (domain, use case, port, adapter) so it applies in any language; `idioms.md` and the recipes show the syntax.

## Contents
1. SOLID applied
2. Design patterns: where they fit and when to skip them
3. Clean code rules
4. Code smells and their fix

DDD building blocks (aggregates, value objects, domain events) are covered in `ddd.md`.

## 1. SOLID applied

### S: Single Responsibility
A unit has one reason to change.
- One use case per class/function (`PlaceOrder`, `CancelOrder`). A `OrderService` with every operation changes for every reason.
- A controller changes when the HTTP contract changes; a repository when storage changes; a domain entity when the rule changes. If one file changes for two of those, split it.
- Smell: a class name ending in `Manager`, `Helper`, `Processor` with an "and" in its description.

### O: Open/Closed
Extend by adding, not by editing tested code.
- New payment provider → new outbound adapter implementing `PaymentGateway`; the use case is untouched.
- Variable business rule (discount, shipping cost, tax) → Strategy/policy objects selected in the composition root or by a small factory, not a growing `if/else` or `switch` on a type string.
- Smell: every new requirement edits the same `switch`.

### L: Liskov Substitution
Any adapter must be swappable for another without the use case noticing.
- Honor the port's contract: same return semantics (`findById` returns "absent" the same way in every implementation), same errors for the same failures, same idempotency and ordering guarantees.
- Enforce with a **shared contract test suite** run against the in-memory fake and each real adapter (see `testing-strategy.md`).
- Smell: `if adapter is SomeConcreteType` in a use case; an adapter that throws `NotImplemented` for a port method.

### I: Interface Segregation
Ports are small and role-specific.
- Split `OrderRepository` into `OrderWriter` and `OrderReader` when the write side and query side have different consumers, or keep one small port per use case need. Never build a 20-method `Repository<T>` that every use case is forced to depend on.
- Smell: fakes that must implement many unused methods.

### D: Dependency Inversion
Source-code dependencies point at abstractions owned by the inner layer.
- The application declares `PaymentGateway`; the Stripe adapter imports and implements it, never the other way around.
- High-level policy (use case) never imports a concrete low-level module (SQL client, HTTP SDK). Construction happens in the composition root.
- Dependency **injection** is the mechanism (constructor injection preferred); DI **container** is optional. Manual wiring is fine and often clearer for small services.

## 2. Design patterns: where they fit and when to skip them

| Pattern | Hexagonal placement | Use when | Skip when |
|---|---|---|---|
| **Repository** | Outbound port (interface) + persistence adapter | Aggregate persistence hidden behind collection-like semantics | Read-only reporting queries: use a dedicated query/read port instead of forcing them through the aggregate repository |
| **Factory / static factory** | Domain (`Order.create`, `Order.rehydrate`) or composition root | Creation has invariants or several steps; separate "new" from "load from storage" | A plain constructor is enough |
| **Strategy** | Domain policy or outbound port with several adapters | Interchangeable algorithm/rule (pricing, routing, tax, provider) | Only one variant exists and none is foreseen |
| **Adapter** | The whole outbound layer; also wraps a legacy or vendor API | Translating a foreign interface into your port | n/a: it is the core idea |
| **Decorator** | Around a use case or a port | Cross-cutting behavior without editing the target: logging, metrics, retry, caching, transaction, authorization | The behavior is a one-off inside a single class |
| **Facade / Anti-Corruption Layer** | Outbound adapter over a messy legacy/vendor model | You must integrate a system whose model would pollute yours | The external model is already clean and stable |
| **Unit of Work** | Outbound port (`UnitOfWork`) implemented by the persistence adapter | Several repositories must commit atomically within one use case | Framework-managed transaction at the use case boundary is enough |
| **Outbox** | Persistence adapter + relay worker (inbound adapter) | Reliably publish events/messages after a DB commit | No messaging or acceptable at-most-once delivery |
| **Domain events / Observer** | Domain raises events; application dispatches through an `EventPublisher` port | Decouple side effects (send email, update projection) from the core transaction | Simple synchronous flow with a single side effect |
| **Specification / Query object** | Domain or application | Reusable, composable filtering rules | A couple of simple filters |
| **Builder / Object Mother** | Test support | Readable test data with sensible defaults | Production code with few fields |
| **Null Object** | Any port with an optional effect | "Do nothing" default (no-op notifier) instead of null checks | The absence should be an explicit error |
| **Result / Either** | Application boundary | Expected failures modeled as values | Exceptions already used consistently and idiomatically |
| **Mediator / CQRS** | Application layer | Distinct read/write models, pipeline behaviors, many use cases needing uniform cross-cutting | Small service: calling the use case directly is simpler than a bus |
| **Circuit breaker / Retry / Timeout** | Outbound adapter (or decorator over the port) | Flaky remote dependency | Local, deterministic calls |
| **Saga / Process manager** | Application layer | A business process spans several services and needs compensation | A single local transaction can do it |

Guidance:
- Prefer **composition** (decorators, strategies injected) over inheritance hierarchies.
- Patterns compound cost. A Mediator plus decorators plus CQRS on a five-endpoint CRUD service is over-engineering. Start with a plain use case and refactor when the need shows up.
- Name things by role, not by pattern (`OrderRepository`, not `OrderRepositoryFactoryStrategy`).

## 3. Clean code rules

Naming and structure
- Names reveal intent and use the domain vocabulary; avoid abbreviations except universal ones. Booleans read as predicates (`isPaid`, `has_stock`, `IsExpired`). Follow the **language's** casing conventions (see `idioms.md`).
- Functions do one thing at one level of abstraction; prefer under ~20 lines and few parameters (three or fewer; group related ones into a value type).
- Avoid boolean flag parameters (`save(order, true)`): split into two functions or use an enum/options type.
- Early returns / guard clauses instead of deep nesting. Avoid nested ternaries.
- No magic numbers or strings: named constants, enums or value objects.
- Command-Query Separation: a method either changes state or returns a value, rarely both.
- Tell, don't ask: `order.pay()` instead of reading state, deciding outside, then setting fields.
- Law of Demeter: avoid `a.getB().getC().doIt()`.

State and side effects
- Prefer immutability; return new values from domain operations where idiomatic. Minimize shared mutable state.
- Push side effects (I/O, time, randomness) to the edges behind ports; keep the core deterministic.
- Fail fast on invalid state. Do not return `null` for "error"; do not use exceptions for normal control flow.

Comments and dead weight
- Code explains *what*; comments explain *why* (a constraint, a trade-off, a link to a ticket). Delete commented-out code and unused parameters/imports.
- Public API docs (the language's doc-comment format) for exported types and non-obvious contracts.

Duplication and abstraction
- DRY applies to knowledge, not to text that happens to look alike. Wait for the **third** repetition before extracting; a wrong abstraction costs more than duplication.
- YAGNI: do not build extension points for requirements nobody has.
- Keep modules cohesive and coupling low; avoid circular dependencies between packages.

Error handling
- Handle an error where you can do something meaningful about it; otherwise add context and propagate. Log at the boundary that handles it, once.
- Error messages state what failed and with which identifiers, without secrets.

## 4. Code smells and their fix

| Smell | Fix |
|---|---|
| Fat controller with rules and SQL | Extract a use case; move SQL to an outbound adapter |
| God service with many unrelated methods | One use case per operation |
| Anemic entity + logic in services | Move behavior next to the data it protects |
| Primitive obsession (`string email`, `float price`) | Value objects |
| Long parameter lists | Input DTO / value object |
| `switch` on type/provider | Strategy or separate adapters |
| Feature envy (method mostly uses another object's data) | Move the method to that object |
| Shotgun surgery (one change touches many files) | Group by feature; consolidate the responsibility |
| Leaky port (returns ORM rows, vendor exceptions) | Return domain types; translate errors in the adapter |
| Static/global access to DB, clock, config | Inject via constructor from the composition root |
| Test needs the DB to check a rule | Pull the rule into the domain/use case and test with fakes |
