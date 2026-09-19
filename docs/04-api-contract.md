# Application API Contract

## 1. API principles

- Base path: `/api/v1`.
- JSON for control and result-page APIs; binary content or a redirect for downloads.
- Entra ID OAuth 2.0 access token on every protected request.
- `202 Accepted` for asynchronous creation; never hold a request open for Databricks completion.
- Stable application identifiers; Databricks identifiers are implementation details.
- UTC timestamps in ISO 8601.
- Consistent problem responses based on RFC 9457-style fields.
- API Management enforces token validity, limits, request size, and coarse rate rules; the application enforces business authorization.

## 2. Authentication and authorization

The React client uses authorization code flow with PKCE. The API validates issuer, audience, signature, lifetime, tenant, and required scopes/roles. Authorization is evaluated for every model, run, result page, and download; possession of a run ID is never sufficient.

Suggested application roles:

- `Reinsurance.Reader`: view authorized runs/results.
- `Reinsurance.Runner`: submit allowed models.
- `Reinsurance.Operator`: view operational details and retry allowed steps.
- `Reinsurance.Admin`: manage model publication/configuration.

Use immutable Entra object IDs internally. Group overage and token-size cases should be handled using application roles or server-side group resolution/caching rather than assuming every group is present in a token.

## 3. Endpoint summary

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/models` | List authorized active models |
| `GET` | `/models/{modelId}` | Model metadata and parameter schema |
| `POST` | `/runs` | Submit an asynchronous run |
| `GET` | `/runs` | List visible runs with filters/cursor |
| `GET` | `/runs/{runId}` | Run status, summary, and links |
| `POST` | `/runs/{runId}/cancel` | Request cancellation |
| `GET` | `/runs/{runId}/events` | Paginated user-safe lifecycle timeline |
| `GET` | `/runs/{runId}/results` | Bounded result page |
| `GET` | `/runs/{runId}/result-schema` | Column types/filter/sort capabilities |
| `GET` | `/runs/{runId}/exports` | Export readiness and formats |
| `POST` | `/runs/{runId}/downloads` | Authorize and issue download |
| `GET` | `/health/live` | Process liveness; no dependencies |
| `GET` | `/health/ready` | Required dependency readiness |

## 4. Submit a run

```http
POST /api/v1/runs
Authorization: Bearer <access-token>
Idempotency-Key: 880c69f4-b5fb-45f6-9e97-47d5cd0464c2
Content-Type: application/json

{
  "modelId": "portfolio-loss-allocation",
  "modelVersion": "2026.09.1",
  "parameters": {
    "underwritingYearFrom": 2022,
    "underwritingYearTo": 2025,
    "regionCodes": ["APAC"],
    "includeFacultative": true
  }
}
```

Response:

```http
HTTP/1.1 202 Accepted
Location: /api/v1/runs/19f6a817-3e26-40bb-bc6b-a05e40562c5c
Retry-After: 10

{
  "runId": "19f6a817-3e26-40bb-bc6b-a05e40562c5c",
  "status": "SUBMITTING",
  "createdAt": "2026-09-19T04:12:31Z",
  "links": {
    "self": "/api/v1/runs/19f6a817-3e26-40bb-bc6b-a05e40562c5c"
  }
}
```

Backend validation includes model active/version state, caller entitlement, parameter schema and ranges, cross-field rules, concurrency/quota policy, and safe normalization. Unknown parameters are rejected.

## 5. Get a run

```json
{
  "runId": "19f6a817-3e26-40bb-bc6b-a05e40562c5c",
  "model": {
    "id": "portfolio-loss-allocation",
    "name": "Portfolio Loss Allocation",
    "version": "2026.09.1"
  },
  "status": "RUNNING",
  "stage": "Applying treaty conditions",
  "progress": {
    "kind": "indeterminate",
    "completedStages": 2,
    "totalStages": 7
  },
  "requestedBy": { "displayName": "Authorized User" },
  "createdAt": "2026-09-19T04:12:31Z",
  "startedAt": "2026-09-19T04:15:08Z",
  "completedAt": null,
  "summary": null,
  "exports": [],
  "links": {
    "events": "/api/v1/runs/19f6a817-3e26-40bb-bc6b-a05e40562c5c/events",
    "cancel": "/api/v1/runs/19f6a817-3e26-40bb-bc6b-a05e40562c5c/cancel"
  },
  "etag": "W/\"17\""
}
```

Do not report fabricated percentages when Databricks cannot provide meaningful progress. Show named stages, elapsed time, and an indeterminate progress state.

## 6. List runs

```http
GET /api/v1/runs?modelId=portfolio-loss-allocation&status=SUCCEEDED&limit=50&cursor=<opaque>
```

Supported filters should include status, model, requester/team subject to role, and created date range. The API returns an opaque next cursor, never exposes raw database offsets, and enforces a maximum range/page size.

## 7. Result page

```http
GET /api/v1/runs/{runId}/results?limit=100&sort=cedantName:asc&cursor=<opaque>&region=APAC
```

```json
{
  "runId": "19f6a817-3e26-40bb-bc6b-a05e40562c5c",
  "schemaVersion": "3",
  "columns": [
    { "key": "cedantName", "label": "Cedant", "type": "string" },
    { "key": "grossLoss", "label": "Gross Loss", "type": "decimal", "scale": 2, "currency": "USD" }
  ],
  "rows": [
    { "cedantName": "Example Re", "grossLoss": "1284500.25" }
  ],
  "page": {
    "limit": 100,
    "nextCursor": "<opaque-signed-cursor>",
    "hasMore": true
  },
  "totalRows": 527318
}
```

Return decimals as strings when JavaScript precision could alter business values. Dates and timestamps have explicit semantics/time zones. `totalRows` comes from the validated run manifest rather than an expensive count on every page.

Allowed filters and sorts are declared by the result schema endpoint. The server maps public column keys to trusted SQL identifiers and binds filter values as parameters.

## 8. Download flow

```http
POST /api/v1/runs/{runId}/downloads
Content-Type: application/json

{ "format": "xlsx" }
```

If ready, respond with a short-lived URL or a `303 See Other` redirect. If generation is still in progress, return `202 Accepted` with artifact status. The URL should expire in minutes, be scoped to one read, use HTTPS, and never be logged in full. Re-authorize every issuance.

Do not expose permanent blob URLs, storage account keys, Unity Catalog paths, or Databricks tokens.

## 9. Errors

```json
{
  "type": "https://api.example.invalid/problems/invalid-parameter",
  "title": "One or more parameters are invalid",
  "status": 422,
  "code": "RUN_PARAMETER_INVALID",
  "detail": "Review the highlighted fields and submit again.",
  "correlationId": "01J82HQVMWJQ0S4B6P6Q9T4YJH",
  "errors": [
    { "field": "underwritingYearTo", "message": "Must be greater than or equal to underwritingYearFrom." }
  ]
}
```

Suggested status mapping:

| Status | Use |
|---|---|
| `400` | Malformed request |
| `401` | Missing/invalid authentication |
| `403` | Authenticated but unauthorized |
| `404` | Resource absent or deliberately concealed |
| `409` | Idempotency conflict or invalid lifecycle transition |
| `422` | Semantically invalid model parameters |
| `429` | Rate/concurrency limit; include `Retry-After` |
| `502` / `503` | Temporary downstream failure/unavailability |

Server responses never include stack traces, SQL text, credentials, internal storage paths, or raw Databricks error bodies. Detailed diagnostics remain in access-controlled logs linked by correlation ID.

## 10. Status notification contract

Push payloads are intentionally small:

```json
{
  "type": "run.status.changed",
  "runId": "19f6a817-3e26-40bb-bc6b-a05e40562c5c",
  "status": "SUCCEEDED",
  "version": 23,
  "occurredAt": "2026-09-19T05:48:02Z"
}
```

Clients treat this as an invalidation signal and fetch canonical state from `GET /runs/{runId}`. PubSub groups are scoped to authorized user/team channels; connection negotiation is performed by the API.

