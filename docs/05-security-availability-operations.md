# Security, Availability, and Operations

## 1. Security objectives

- Authenticate every human and workload identity.
- Authorize every model, run, result query, and download.
- Keep secrets and privileged tokens out of the browser, source code, logs, and job parameters.
- Protect reinsurance data in transit, at rest, and during export.
- Preserve traceability without logging sensitive business content.
- Limit blast radius through separate identities, environments, network boundaries, and least privilege.

## 2. Identity design

### Human identity

- Entra ID authorization code flow with PKCE.
- MSAL in React with in-memory token cache preferred; avoid storing bearer tokens in `localStorage`.
- Conditional Access, MFA, compliant-device, and sign-in risk policies remain tenant concerns and should be enabled for production based on enterprise standards.
- Short token lifetimes and silent renewal; no application-managed passwords.

### Workload identity

- Managed identity for Azure resources wherever the target supports it.
- For Azure Databricks API access, use an Entra service principal/workload identity with OAuth tokens and the minimum workspace/job permissions.
- Assign run permission only on approved jobs; do not grant workspace administrator or unrestricted cluster creation rights.
- Use separate service identities per environment and, where useful, separate identities for orchestration and result reading.
- Prefer secretless federation. Store unavoidable secrets/certificates in Key Vault with rotation and access logging.

## 3. Authorization model

Authorization has two layers:

1. Application authorization determines who may discover/run a model, view a run, query its result, cancel it, or download artifacts.
2. Data-platform authorization limits service principals and jobs to required Unity Catalog catalogs, schemas, tables, views, and volumes.

Recommended object rules:

- Model access is mapped to application roles/groups.
- A run inherits model scope plus ownership/team visibility at creation.
- Operators can inspect technical metadata but do not automatically receive result-data access.
- Admin role does not imply unrestricted business-data access unless explicitly approved.
- Every download request re-evaluates current authorization, including disabled users and expired run access.
- If row-level restrictions are required, enforce them in governed views/dynamic views and include user/team scope in the backend query policy.

## 4. Data protection

- TLS 1.2 or higher for all network traffic.
- Azure platform encryption at rest; customer-managed keys only if policy requires them.
- Private endpoints/Private Link for API dependencies, storage, SQL, and Databricks connectivity in production where supported.
- Disable public access when private connectivity is operational; control egress with firewall/NAT policy.
- Redact sensitive parameters and result values from structured logs and APM breadcrumbs.
- Store only metadata needed for product behavior; avoid duplicating analytical rows in Azure SQL.
- Classify output files, set content disposition safely, disable public containers, and use short-lived read-only access.
- Apply retention, deletion, legal hold, and audit requirements consistently to Delta data and exported files.

## 5. Threats and controls

| Threat | Primary controls |
|---|---|
| Credential exposure in browser | Backend mediation, PKCE, no Databricks token client-side, in-memory token cache |
| Broken object-level authorization | Per-request run/model authorization; opaque UUIDs; tests for cross-user access |
| SQL injection | Parameter binding; server allow-list for columns/operators/identifiers; no arbitrary SQL endpoint |
| Duplicate expensive runs | Idempotency keys, normalized request hash, user/model quotas |
| Denial of wallet/service | APIM throttles, concurrency caps, job queues, Databricks budgets/policies, alerts |
| Malicious model parameters | Strict schema, ranges, enumerations, cross-field checks, payload limits |
| Spreadsheet formula injection | Escape dangerous text prefixes; document export behavior |
| Download URL leakage | Very short expiry, HTTPS, no URL logging, re-authorization before issue |
| Sensitive logs/errors | Structured allow-listed telemetry, safe error mapper, restricted log access |
| Over-privileged job | Dedicated identity, UC grants, approved job IDs, cluster policies |
| Supply-chain compromise | Lockfiles, dependency scanning, signed/reproducible builds, protected CI environments |
| Cross-site scripting | React escaping, strict CSP, no unsafe HTML, output encoding, dependency review |
| CSRF | Bearer tokens not cookies for API calls; validate origin/CORS; CSRF tokens if cookies are introduced |
| Event spoofing/data leak | Authenticated PubSub negotiation, scoped groups, minimal event payload, canonical API refetch |

## 6. Secure HTTP baseline

- Content Security Policy with explicit application/API/connect sources and no unsafe inline script in production.
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, restrictive `Referrer-Policy`, and `Permissions-Policy`.
- Frame protection through CSP `frame-ancestors`.
- Explicit CORS allow-list per environment; never wildcard with credentials.
- Request/body and upload limits at Front Door/APIM and API.
- Correlation IDs generated/validated at the edge; untrusted client headers are sanitized.
- Avoid sensitive query-string data because URLs appear in browser history and logs.

## 7. Availability architecture

### Design principles

- Stateless API instances scale horizontally.
- Durable orchestration and metadata survive restarts.
- Databricks job execution is independent of browser and API process lifetime.
- Push notifications are optional; polling and reconciliation restore correctness.
- Analytical results are committed before success is visible.
- Retries are bounded and idempotent.

### Failure handling

| Failure | Expected behavior |
|---|---|
| Browser closes | Run continues; history shows latest status on return |
| Push connection drops | UI polls with backoff and reconnects |
| API instance restarts | Durable state/metadata continue; another instance serves requests |
| Databricks submit timeout | Reconcile by run tag/id before retrying submission |
| Databricks job fails | Mark run failed with safe reason; preserve technical correlation |
| SQL warehouse cold start | Show bounded loading state; retry transient errors; cache summary where appropriate |
| Export generation fails | Retry export independently; detailed results remain available; mark warning if policy allows |
| Metadata DB unavailable | Reject new runs with `503`; do not create untracked Databricks jobs |
| PubSub unavailable | Runs continue; polling remains functional |
| Missed terminal update | Scheduled reconciler queries non-terminal runs and repairs state |

## 8. Scaling and quotas

- Configure autoscaling limits for Functions/Container Apps; prevent uncontrolled fan-out.
- Enforce per-user, per-team, and per-model active-run quotas.
- Use a queue/durable orchestrator to smooth bursts and respect Databricks concurrency.
- Return `429` with an estimated/retry delay when quota is reached.
- Configure job cluster policies, maximum workers, timeouts, and auto-termination.
- Use Databricks pools/serverless/job compute based on measured startup, isolation, and cost requirements.
- Scale SQL warehouses independently from job compute; enable auto-stop.
- Track queue time separately from execution time so capacity problems are visible.

## 9. Recovery objectives

Final targets require business approval. Proposed starting targets:

| Capability | POC target | Production candidate |
|---|---|---|
| Web/API availability | Best effort during working sessions | 99.9% monthly |
| Run metadata RPO | Backups/configured durability | <= 15 minutes |
| Run metadata RTO | Manual recovery acceptable | <= 4 hours |
| Analytical results | Recomputable from governed inputs/code | Defined by data platform policy |
| Active-run recovery | Reconcile with Databricks | <= 15 minutes after service restoration |

Azure SQL point-in-time restore, geo/zone redundancy, storage redundancy, Databricks workspace recovery, and region-pair design must follow enterprise policy and data residency rules. A multi-region active-active design is not justified for the initial POC.

## 10. Observability

### Correlation

Carry `request_id`, `correlation_id`, and `run_id` through APIM, API logs, orchestration, Databricks job parameters/tags, metadata events, and export manifests. Do not use user email as the primary correlation key.

### Metrics

- Submission count and rejection count by safe model identifier.
- Active/queued runs, queue duration, execution duration, validation duration, export duration.
- Success, failure, cancellation, timeout, and retry rates.
- Result API latency, SQL warehouse latency, rows/page, scanned bytes where available.
- Download requests, artifact generation failures, and artifact size.
- API 4xx/5xx, dependency latency, throttling, authentication/authorization failures.
- Databricks compute utilization and estimated cost attribution by model/run tags.

### Logs and traces

- Structured JSON logs with stable event names.
- Distributed traces for API dependencies where supported.
- Audit events for submission, cancellation, status transitions, result access, and download issuance.
- Access-controlled technical links from the operator view to Databricks runs.
- Sampling may apply to routine traces, but security and lifecycle audit events are never sampled away.

### Alerts

- Sustained submission failures or API 5xx rate.
- Runs stuck in one state beyond model-specific thresholds.
- Reconciliation backlog or scheduler failure.
- Databricks job failure spike, excessive queue time, or budget threshold.
- Metadata database capacity/connectivity issues.
- Export failure rate or storage approaching quota.
- Authentication anomalies and repeated forbidden-access attempts.

## 11. Operational jobs and runbooks

Scheduled processes:

- Reconcile all non-terminal runs with Databricks.
- Detect stuck/orphaned runs and exports.
- Enforce retention and clean staging outputs.
- Verify artifact manifests/checksums where required.
- Refresh model catalog/configuration if externally managed.
- Report capacity, performance, failure, and cost trends.

Required runbooks:

- Job submission outage.
- Stuck run and safe reconciliation.
- Failed export regeneration.
- Metadata restore.
- Credential/certificate rotation failure.
- Suspected data exposure or compromised download link.
- Databricks workspace/SQL warehouse degradation.
- Retention job failure.

## 12. Deployment security

- Infrastructure as code for Azure and Databricks permissions/jobs.
- Separate CI identities and protected environment approvals.
- Static analysis, dependency/license scan, secret scan, unit/integration tests, and infrastructure policy checks.
- Build once and promote immutable artifacts.
- Database migrations are versioned, backward compatible during rolling deployment, and recoverable.
- Use feature flags for incomplete user-facing behavior, never to bypass authorization.
- Production diagnostics and data access are time-bound, approved, and audited.

