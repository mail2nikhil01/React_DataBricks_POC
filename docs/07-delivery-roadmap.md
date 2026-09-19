# Delivery Roadmap, Testing, and Decisions

## 1. Delivery approach

Build vertical slices so each phase leaves an end-to-end demonstrable capability. Use a simulated Databricks adapter first, then connect a minimal real job, then prove representative scale before polishing secondary features.

## 2. Phase 0: discovery and contracts

Deliverables:

- Confirm POC model, business owner, parameters, validation rules, result schema, summaries, and representative data volume.
- Confirm Entra tenant/app registrations, roles/groups, Databricks workspace, Unity Catalog locations, and networking constraints.
- Record data classification, retention, visibility rules, Excel expectations, concurrency, budget, and target availability.
- Benchmark the existing SQL and identify expensive joins/skew/shuffles.
- Agree API schemas, run states, error codes, and export thresholds.
- Produce low-fidelity workflow wireframes and obtain business sign-off.

Exit criteria: no unresolved decision that changes identity, data visibility, output contract, or core infrastructure.

## 3. Phase 1: application foundation

Deliverables:

- React TypeScript shell, routing, accessible design tokens/components, and responsive navigation.
- Entra login/logout and protected routes.
- Backend API skeleton, token validation, role checks, correlation, safe errors, and health endpoints.
- Azure SQL metadata schema and migrations.
- Model catalog API plus dynamic parameter form.
- Local/synthetic Databricks adapter that simulates lifecycle states and representative result pages.
- Infrastructure-as-code baseline and CI quality gates.

Exit criteria: an authorized user can submit a simulated run, leave/return, and see durable state/history.

## 4. Phase 2: Databricks execution slice

Deliverables:

- Version-controlled Databricks job definition and model artifact.
- OAuth/service-principal integration with least privileges.
- Idempotent run submission and mapping of Databricks lifecycle states.
- Durable polling/reconciliation and cancellation.
- Staging, validation, atomic publication, and run manifest in Unity Catalog.
- Structured logs, traces, dashboards, and initial alerts.

Exit criteria: one approved model executes end to end and a run is traceable across UI, API, Databricks, and Unity Catalog.

## 5. Phase 3: heavy results and exports

Deliverables:

- Result schema endpoint and allow-listed filter/sort definitions.
- SQL warehouse result paging with opaque cursors and query limits.
- Virtualized data grid with loading/error/empty/accessibility states.
- Summary metrics contract and display.
- Streaming XLSX generation, sheet splitting, formula-injection protection, manifest/checksum, and secure download.
- CSV/Parquet fallback for oversized outputs.
- Performance/capacity tests using representative nine-million-input and 500,000-output workloads.

Exit criteria: scale tests meet agreed targets without loading full results into browser or API memory.

## 6. Phase 4: hardening and stakeholder readiness

Deliverables:

- Web PubSub notifications with polling fallback.
- Security review and penetration test remediation.
- Failure injection for API restart, PubSub loss, Databricks timeout, export failure, and metadata outage.
- Retention jobs, operational runbooks, backup/restore exercise, and cost alerts.
- Accessibility audit, browser testing, executive UX review, and user acceptance testing.
- Production topology/private networking changes required by policy.

Exit criteria: operational ownership, security approval, UAT sign-off, recovery evidence, and deployment/rollback plan are complete.

## 7. Test strategy

### Unit tests

- Parameter and cross-field validation.
- Role/model/run authorization decisions.
- Databricks-to-application state mapping and terminal-state monotonicity.
- Idempotency request hashing and conflict behavior.
- Cursor signing/validation and filter compiler allow-lists.
- Error redaction and formula-injection sanitization.
- Export sheet splitting and numeric/date precision.

### Component and UI tests

- Dynamic controls from model parameter schema.
- All run states, long labels, empty/error/loading states.
- Grid paging/filter/sort and stale-request cancellation.
- Authentication expiry/recovery and forbidden states.
- Keyboard, focus, live-region, contrast, and responsive behavior.

### Integration tests

- API with Azure SQL and mocked Databricks/PubSub/storage.
- Databricks job against synthetic Unity Catalog tables.
- OAuth token acquisition and least-privilege negative cases.
- Result query parameterization and cross-run data isolation.
- Export generation, checksum, expiry, and re-authorization.

### End-to-end tests

- Login, select model, validate, submit, monitor, complete, page results, and download.
- Close/reopen browser during execution.
- Repeat submission with same idempotency key.
- Cancel queued and running jobs.
- Failed model, failed validation, and export warning.
- User A cannot access User B/team-restricted run via guessed ID.

### Performance and resilience tests

- Representative source/output volumes, not tiny extrapolations alone.
- Concurrent submissions and result browsing under agreed user load.
- SQL warehouse cold/warm behavior and cursor-page latency.
- XLSX generation time, peak memory, file size, and spreadsheet openability.
- Restart API during active runs and verify reconciliation.
- Disconnect PubSub and verify polling.
- Inject transient Databricks and storage faults and verify bounded retries.

## 8. Acceptance criteria for the POC

- Entra-authenticated and authorized users can discover and run the selected model.
- `POST /runs` returns promptly with a durable run ID and is idempotent.
- A 12-minute-to-two-hour job continues independently of browser sessions.
- The UI accurately shows lifecycle states and recovers from missed events/reloads.
- Successful output is stored as governed Delta data with run/model/input provenance.
- At least 500,000 rows can be navigated through server-side pages and approved filters/sorts.
- Complete output can be downloaded in the agreed format without browser/API memory exhaustion.
- Multiple executions remain available with correct ownership and independent artifacts.
- Security tests confirm no direct Databricks credentials, cross-user run access, arbitrary SQL, or permanent public download URL.
- Support can trace a user-visible correlation/run ID through application and Databricks telemetry.

## 9. Suggested repository shape

```text
/
├── apps/
│   ├── web/                  React TypeScript application
│   └── api/                  Azure Functions API/orchestrations
├── databricks/
│   ├── resources/            Job/bundle definitions
│   ├── src/                  SQL/notebooks/Python package
│   └── tests/
├── infra/                    Bicep or Terraform modules/stacks
├── packages/
│   └── contracts/            Shared generated API types/schemas
├── tests/
│   ├── e2e/
│   ├── performance/
│   └── security/
├── docs/
└── README.md
```

Choose one infrastructure language based on organizational standards. Avoid sharing business runtime code between frontend and backend merely for convenience; share generated contracts and validation schemas only where trust boundaries remain clear.

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing SQL remains slow or unstable | Long waits/cost/failures | Profile query plan, optimize Delta layout, stage reusable intermediates, right-size compute, establish per-model timeout |
| XLSX too large for consumers | Poor download/open experience | Agree threshold, split sheets, offer compressed CSV/Parquet, publish file size before download |
| SQL warehouse paging is expensive | Slow results/cost | Deterministic keyset paging, clustered data, constrained filters, cached summaries/first page |
| Ambiguous ownership/visibility | Data leakage | Decide policy before build; central authorization tests and audit events |
| Databricks/API quotas | Queue growth | Per-model concurrency, backpressure, capacity metrics, `429` behavior |
| POC shortcuts become production debt | Security/reliability gap | Mark omitted controls, retain interfaces, require hardening exit gate |
| Model/output schema changes | Broken UI/export | Version parameter/result contracts; immutable run version; compatibility tests |
| Cost growth from retained outputs | Budget pressure | Retention policy, tiered formats, cleanup automation, cost allocation tags |

## 11. Open decisions before implementation

The product owner and platform/data owners should resolve these. Recommended defaults are included.

| Decision | Recommended default |
|---|---|
| POC model | Select one high-value model with representative joins and output volume |
| Run visibility | Own runs plus explicitly assigned team scope; operators see metadata only by default |
| Metadata store | Azure SQL for transactionality and reporting familiarity |
| Backend | TypeScript Azure Functions + Durable Functions; choose .NET if enterprise support standards require it |
| POC hosting | Azure Static Web Apps for React assets, APIM + Function App for API |
| Databricks execution | Lakeflow Job with parameterized multi-task workflow |
| Result pattern | Shared Delta result table keyed by `run_id` when output schemas align |
| Result serving | SQL warehouse via backend, cursor pagination, max 500 rows/page |
| Notifications | Web PubSub plus polling/reconciliation fallback |
| Export | Pre-generated streaming XLSX; compressed CSV/Parquet for oversized output |
| XLSX threshold | Benchmark first; never exceed 1,048,576 rows per sheet; set lower practical size limit after user testing |
| Data retention | Define with compliance before production; use short POC retention for synthetic data |
| IaC | Use enterprise standard; otherwise Bicep for Azure plus Databricks Asset Bundles |
| Grid | Evaluate AG Grid licensing; fallback to TanStack Table + Virtual |

## 12. Decision log

Record approved changes here and update the authoritative detail document.

| Date | Decision | Owner | Affected documents |
|---|---|---|---|
| 2026-09-19 | Initial architecture baseline documented; implementation remains pending explicit approval | Product/architecture review pending | All |

## 13. Implementation authorization gate

No application code should be built solely from this document set until the reviewer confirms:

- the architecture direction;
- the selected POC model and data contract;
- identity/access assumptions;
- backend language and Azure services available in the subscription;
- acceptable export formats and retention;
- permission to begin implementation.

