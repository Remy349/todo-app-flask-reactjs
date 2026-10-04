<!-- GENERATED from shared/ddd.md by scripts/build.mjs. Edit the source, not this file. -->

# Domain-Driven Design in a hexagonal backend

DDD decides **what** the model is and **where its boundaries are**; hexagonal architecture decides **how that model is isolated** from delivery and storage. Use them together: each bounded context is a hexagon (a service or a module of a modular monolith), and tactical DDD lives inside its domain layer.

DDD is an investment. Spend it on the core subdomain, keep it light elsewhere.

## Contents
1. Strategic design: subdomains
2. Bounded contexts and ubiquitous language
3. Context mapping, expressed as ports and adapters
4. Tactical building blocks
5. Aggregate design rules
6. Domain events vs integration events
7. Repositories, factories and specifications
8. Modular monolith layout
9. When not to use DDD
10. Review checklist

## 1. Strategic design: subdomains

Classify each area of the business before deciding how much architecture it deserves.

| Subdomain | What it is | Investment |
|---|---|---|
| **Core** | Where the business competes; rules change often and matter | Full hexagonal + tactical DDD, best people, most tests |
| **Supporting** | Needed, specific to the business, but not a differentiator | Thin slices, simple model, hexagonal boundaries only where integrations exist |
| **Generic** | Solved problem (identity, email, payments, invoicing PDFs) | Buy or use a library/SaaS behind a port; do not model it yourself |

If you cannot tell which subdomain a feature belongs to, ask. The answer changes the design more than any pattern choice.

## 2. Bounded contexts and ubiquitous language

- A **bounded context** is the boundary inside which one model and one vocabulary are consistent. "Order" in Sales (cart, pricing, discounts) is not "Order" in Shipping (parcels, addresses, carriers). Two models, two contexts, linked by an id.
- Inside a context, code uses the **ubiquitous language**: class, method, event and error names are the words domain experts use (`Order.cancel()`, `OrderCancelled`, `CANCELLATION_WINDOW_EXPIRED`). When the business vocabulary changes, rename the code.
- Never share entity classes or tables between contexts. Share ids and published contracts (events, API schemas) only.
- One team or one module owns a context. A context maps to one hexagon: its own `domain/`, `application/` and `adapters/`.
- Signs that a context boundary is wrong: the same class grows fields for unrelated teams; a change in one area forces coordinated releases in another; words mean different things in the same module.

## 3. Context mapping, expressed as ports and adapters

Relationships between contexts become concrete adapters. Pick the relationship deliberately.

| Relationship | Meaning | Hexagonal implementation |
|---|---|---|
| **Anti-Corruption Layer (ACL)** | Protect your model from a foreign or legacy model | Outbound port in your terms (`CustomerDirectory`) + adapter that calls the other system and translates its model and errors. The foreign types never cross the adapter. |
| **Open Host Service** | You expose a stable protocol for many consumers | Inbound adapter (REST, gRPC, messaging) with its own DTOs, versioned independently of the domain |
| **Published Language** | A documented shared format (JSON schema, event schema, OpenAPI) | Integration event / API contract types owned by the adapter layer, never the domain entities |
| **Customer / Supplier** | Upstream team plans for downstream needs | Contract tests (consumer-driven) at the adapter boundary |
| **Conformist** | Downstream adopts the upstream model as is | Acceptable only for generic subdomains; still keep it behind a port so the choice is reversible |
| **Shared Kernel** | Two contexts share a small piece of model | Rare; keep it tiny (ids, money), versioned and jointly owned. Never share aggregates |
| **Separate Ways** | No integration; duplication is cheaper | Nothing to build |

Default for integrating anything you do not control: **ACL as an outbound adapter**.

## 4. Tactical building blocks

| Block | Definition | Rules |
|---|---|---|
| **Value object** | Immutable, equality by value, self-validating (`Money`, `Email`, `Quantity`, `DateRange`) | The cheapest, highest-value tool. Use it wherever a primitive carries a rule. Operations return new values. |
| **Entity** | Identity + lifecycle; equality by id | Protects its own invariants; exposes behavior, not setters |
| **Aggregate** | Cluster of entities and value objects with one **root**, forming a consistency boundary | All changes go through the root; the root guarantees invariants after every operation |
| **Domain service** | Stateless domain operation that does not belong to one entity (`PricingPolicy`, `TransferService`) | Pure: no I/O. If it needs data, the use case loads it and passes it in |
| **Domain event** | Immutable fact in past tense (`OrderPlaced`) raised by an aggregate | Carries ids and the data consumers need; recorded by the aggregate, dispatched after commit |
| **Application service** | The use case | Orchestration, transaction, authorization; no business rules |
| **Policy** | A named business rule, often a strategy (`RefundPolicy`) | Lives in the domain; selected in the composition root when it varies |

## 5. Aggregate design rules

1. **Model true invariants inside the boundary.** Only what must be consistent *immediately* belongs in one aggregate (order lines and order total). Everything else is eventually consistent.
2. **Keep aggregates small.** Prefer a root with value objects over deep entity graphs. Large aggregates cause contention and slow loads.
3. **Reference other aggregates by id**, never by object reference. `Order` holds `customerId`, not a `Customer`.
4. **Modify one aggregate per transaction.** When a change must affect another aggregate, raise a domain event and update the other one in a separate transaction (eventual consistency), or reconsider the boundary.
5. **Protect invariants in the root.** No public setters; expose intention-revealing methods (`addLine`, `cancel`, `markPaid`) that validate and transition state.
6. **Use optimistic concurrency** (a `version` field) to detect concurrent modifications of the same aggregate.
7. **Model state transitions explicitly** (an enum/union of statuses plus guarded transition methods). Invalid transitions raise a domain error with a stable code.

## 6. Domain events vs integration events

| | Domain event | Integration event |
|---|---|---|
| Scope | Inside one bounded context | Between contexts or services |
| Shape | Domain types, can change freely | Versioned public contract (published language) |
| Delivery | In-process, after the aggregate is saved | Through a broker, via the **outbox** |
| Handlers | Other use cases in the same context | Inbound adapters (consumers) of other contexts |

Flow: the aggregate records `OrderPlaced` → the use case saves the aggregate and stores the events (or their integration translation) in the **outbox table in the same transaction** → a relay publishes outbox rows to the broker → consumers are idempotent (they deduplicate by event id).

Never publish to a broker inside the database transaction and never publish before commit.

## 7. Repositories, factories and specifications

- **Repository = one per aggregate root**, not per table. It loads and saves whole aggregates; methods speak the domain language (`findById`, `findPendingOlderThan`), never `executeQuery`.
- Queries for screens and reports do not need aggregates: use a separate **read port** returning DTOs (a light form of CQRS). This keeps aggregates focused on writes.
- **Factories** (`Order.create`, `Order.rehydrate`) separate creation with invariants from reconstruction from storage.
- **Specification** objects encapsulate reusable business predicates (`OverdueInvoice`). Use them when the same rule is needed in memory and in queries; the persistence adapter translates them to SQL.

## 8. Modular monolith layout

Start with one deployable containing several bounded contexts as modules; extract a service only when a context needs independent scaling, deployment or ownership.

```
src/
  sales/            # bounded context = hexagon
    domain/  application/  adapters/  composition
  shipping/
    domain/  application/  adapters/  composition
  shared_kernel/    # tiny: ids, money. Optional.
  bootstrap/        # global wiring, config, server
```

Rules: a context calls another only through the other's **published application contract** (a use case interface or an integration event), never by importing its domain or repositories. Enforce this with the architecture test tool of your language.

## 9. When not to use DDD

- CRUD administration screens, reference data, configuration tables: thin slices.
- Generic subdomains: integrate a product behind a port.
- Prototypes whose domain is still unknown: keep boundaries (ports) but postpone aggregates and events until the rules are clear.
- A team that does not have access to domain experts: DDD without conversations degenerates into ceremony. Model what you know; revisit.

## 10. Review checklist

- [ ] The feature's bounded context and subdomain type are explicit.
- [ ] Names in code match the business vocabulary of that context.
- [ ] No entity or table is shared between contexts; integration goes through ids, use case contracts or integration events.
- [ ] Foreign models are translated in an ACL adapter.
- [ ] Aggregates are small, referenced by id, modified one per transaction, with versioning where concurrent edits are possible.
- [ ] State transitions are explicit and guarded; invalid ones return a coded domain error.
- [ ] Events are recorded in the domain and published after commit via outbox; consumers are idempotent.
- [ ] Read-heavy screens use a read port instead of loading aggregates.
