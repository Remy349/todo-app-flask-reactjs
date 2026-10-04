<!-- GENERATED from shared/rest-api.md by scripts/build.mjs. Edit the source, not this file. -->

# REST API conventions for the inbound HTTP adapter

Everything here lives in the **inbound adapter** (routes/controllers, DTOs, middleware, error mapping). The use cases stay ignorant of HTTP. Use it as a checklist when designing or reviewing an endpoint.

## Contents
1. Resource modeling and URLs
2. Methods, status codes and idempotency
3. Request/response DTOs and validation
4. Error format (RFC 9457 Problem Details)
5. Pagination, filtering, sorting
6. Concurrency, idempotency keys, async operations
7. Versioning and contract
8. Security basics
9. Operational endpoints
10. Endpoint review checklist

## 1. Resource modeling and URLs

- Model **resources (nouns)**, not actions: `POST /orders`, not `POST /createOrder`. Use plural collection names: `/orders`, `/orders/{orderId}`.
- Use lowercase kebab-case in paths (`/purchase-orders`); use the JSON casing convention of the ecosystem consistently for bodies (camelCase is the common default; snake_case is fine in Python-first APIs if applied everywhere). Pick one and never mix.
- Nest only to express ownership and only one level deep: `/orders/{orderId}/items`. Beyond that, expose the child at top level with a filter.
- For operations that are not CRUD, model the state change as a sub-resource or an explicit command endpoint: `POST /orders/{id}/cancellation` or `POST /orders/{id}:cancel`. Keep it consistent with the rest of the API. This maps naturally to one use case (`CancelOrder`).
- Identifiers: opaque strings (UUID/ULID). Do not expose auto-increment integers if enumeration is a risk.
- Dates and times: ISO 8601 in UTC (`2026-09-20T14:30:00Z`). Money: integer minor units plus a currency code, or a decimal string. Never a binary float.

## 2. Methods, status codes and idempotency

| Method | Meaning | Safe | Idempotent | Success |
|---|---|---|---|---|
| GET | Read | yes | yes | 200 |
| POST | Create / run a command | no | no (unless idempotency key) | 201 + `Location`, or 200/202/204 |
| PUT | Replace whole resource | no | yes | 200 or 204 |
| PATCH | Partial update | no | not guaranteed | 200 or 204 |
| DELETE | Remove | no | yes | 204 (repeat may return 404 or 204; be consistent) |

Status codes to use deliberately:

| Code | Use |
|---|---|
| 200 OK | Successful read/update with body |
| 201 Created | Resource created; include `Location` header and the representation or its id |
| 202 Accepted | Work accepted for async processing; return a status resource URL |
| 204 No Content | Success without body |
| 400 Bad Request | Malformed request or failed shape validation |
| 401 Unauthorized | Missing/invalid credentials (authentication) |
| 403 Forbidden | Authenticated but not allowed (authorization) |
| 404 Not Found | Resource does not exist (or you choose not to reveal it) |
| 409 Conflict | State conflict: duplicate, version mismatch, invalid transition |
| 412 Precondition Failed | `If-Match` did not match |
| 415 Unsupported Media Type | Wrong `Content-Type` |
| 422 Unprocessable Content | Well-formed request violating a business rule (pick 400 or 422 for validation and stay consistent) |
| 429 Too Many Requests | Rate limited; send `Retry-After` |
| 500 Internal Server Error | Unexpected bug (generic body) |
| 502/503/504 | Upstream failure / unavailable / upstream timeout |

Never return 200 with an error payload. Never use 500 for something the client can fix.

## 3. Request/response DTOs and validation

- Request and response DTOs belong to the adapter. Map them explicitly to the use case input/output. Explicit mapping also prevents **mass assignment** (a client setting `isAdmin` or `status` because the whole body was bound to an entity).
- Do not return domain entities or ORM models. Response shapes are a public contract; entities are internal and change often.
- Validate at the edge: required fields, types, ranges, lengths, formats (email, UUID, enum values), max body size, unknown fields policy (reject or ignore, decide once). Use the validator of the detected framework (see `references/frameworks/`).
- Business validation (is this coupon still valid, is stock available) stays in the domain/use case, and comes back as a business error.
- Return **all** shape errors at once with their field paths instead of the first failure.
- Set `Content-Type: application/json` (or `application/problem+json` for errors). Use `Location` for created resources.

## 4. Error format (RFC 9457 Problem Details)

Use `application/problem+json`. One central handler produces it; use cases never build it.

```json
{
  "type": "https://api.example.com/problems/order-already-paid",
  "title": "Order already paid",
  "status": 409,
  "detail": "Order 7c1d... has already been paid and cannot be modified.",
  "instance": "/orders/7c1d...",
  "code": "ORDER_ALREADY_PAID",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

For validation errors add an `errors` array:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Request validation failed",
  "status": 400,
  "errors": [
    { "field": "amountCents", "code": "MUST_BE_POSITIVE", "message": "must be greater than 0" }
  ]
}
```

Rules:
- `code` is stable and documented; `detail` is for humans and may change.
- For 5xx return a generic title and a `traceId`; log the full exception server-side once. Never include stack traces, SQL, hostnames or internal class names.
- Map errors by **type**, in a table in the adapter (`DomainErrorNotFound → 404`, `Conflict → 409`, ...), so adding a new domain error is a one-line change.

## 5. Pagination, filtering, sorting

- Every collection endpoint is paginated with a server-side maximum page size.
- **Cursor pagination** (`?limit=50&cursor=...`) for large or frequently changing data; response includes `nextCursor`. **Offset pagination** (`?page=1&pageSize=50`) is acceptable for small, stable, admin-style lists.
- Filtering by query params (`?status=paid&createdAfter=2026-01-01T00:00:00Z`). Sorting with `?sort=-createdAt,total` (leading `-` for descending). Whitelist sortable fields; never pass raw column names into SQL.
- The pagination contract is an application-level concept (a `Page<T>` DTO with items and next cursor); the SQL specifics stay in the outbound adapter.

## 6. Concurrency, idempotency keys, async operations

- **Optimistic concurrency**: return an `ETag` (or `version` field) on reads; require `If-Match` on updates; respond 412 (or 409) on mismatch. The use case/domain owns the version check semantics; the adapter maps headers.
- **Idempotency**: accept an `Idempotency-Key` header on non-idempotent POSTs (payments, order placement). Store key + request fingerprint + response for a retention window; replay the stored response on retries; reject the same key with a different payload (422/409). Implement the store as an outbound port used by a decorator or the use case.
- **Long-running work**: respond `202 Accepted` with `Location: /operations/{id}`; the operation resource reports `pending | running | succeeded | failed` and a result link. Do the work in a worker (another inbound adapter on a queue), not in the request thread.

## 7. Versioning and contract

- Version in the URL prefix (`/v1/...`) or a header; choose one and keep it. Only bump the major version for breaking changes. Additive changes (new optional fields, new endpoints) are not breaking; clients must ignore unknown fields.
- Publish an **OpenAPI** description. Generate it from code with the framework's tooling or write it contract-first and generate server stubs. Keep it in CI: fail when the spec changes unexpectedly.
- Deprecate with `Deprecation` and `Sunset` headers and a documented timeline.
- Include an inbound-adapter test that pins the response shape of critical endpoints.

## 8. Security basics

- TLS everywhere; authenticate in middleware (JWT/OIDC, API keys, mTLS) and pass a plain principal to use cases. Authorize at two levels: coarse (route/role) in the adapter, and resource-level/business permissions in the use case or a domain policy.
- Parameterized queries only; never build SQL from input. Validate and bound every input (length, size, count).
- Return 404 instead of 403 when revealing existence is itself a leak.
- Configure CORS explicitly (no wildcard with credentials). Limit request body size and set server timeouts.
- Rate limit per client/IP on expensive or sensitive endpoints; return 429.
- Never log secrets, tokens, passwords or full payment/PII data. Redact by default.
- Do not trust client-supplied ids for ownership; take the owner from the authenticated principal.
- Keep dependencies updated and scan them in CI.

## 9. Operational endpoints

- `GET /health/live` (process is up) and `GET /health/ready` (dependencies reachable) with no auth and no business data.
- Emit metrics (request rate, latency percentiles, error rate) and traces with a propagated `traceparent`/correlation id. Echo the correlation id in responses.
- Structured JSON logs per request: method, path template (not raw ids), status, duration, correlation id.

## 10. Endpoint review checklist

- [ ] Resource-oriented URL, correct method, correct success status, `Location` on 201.
- [ ] Explicit request/response DTOs; no entity or ORM model exposed; no mass assignment.
- [ ] Shape validation at the edge with field-level errors; business rules in domain/use case.
- [ ] Errors are `application/problem+json` with stable `code`; 5xx leak nothing.
- [ ] Collections paginated with a max page size; sort/filter fields whitelisted.
- [ ] Idempotency or concurrency control where retries or races are possible.
- [ ] AuthN in middleware, AuthZ enforced per resource, owner taken from the principal.
- [ ] Timeouts, body-size limit, rate limit on sensitive routes.
- [ ] Documented in OpenAPI and covered by an adapter-level test.
