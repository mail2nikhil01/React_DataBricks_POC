# Project Charter and Requirements

## 1. Purpose

Build a polished web application for reinsurance analysts and senior stakeholders to select an approved analytical model, submit parameters, execute long-running Databricks SQL/model logic, track progress, inspect tabular results, revisit prior runs, and download output files.

The system is a proof of concept, but its boundaries should support an Azure production deployment without requiring a redesign of authentication, execution, data governance, or heavy-result handling.

## 2. Business context

Reinsurance model runs combine large governed datasets using joins, filters, calculations, and model-specific conditions. A run may process more than nine million source records, take approximately 12 minutes to two hours, and produce 500,000 or more output rows. Users must not be required to keep a browser tab open while a model executes.

The application is an orchestration and consumption layer. Databricks remains the compute and governed data platform; the web application does not reproduce analytical logic.

## 3. Personas

### Reinsurance analyst

- Starts model runs and supplies validated business parameters.
- Monitors active executions and diagnoses understandable failures.
- Filters, sorts, and reviews result samples or pages.
- Downloads complete output files for downstream analysis.
- Compares metadata and outcomes across previous runs.

### Senior stakeholder / managing director

- Needs an executive view of run status, key result metrics, freshness, and model/version provenance.
- Should not need to understand Databricks terminology.
- Expects concise summaries and confidence that data is controlled and current.

### Platform operator / support

- Traces application run IDs to Databricks run IDs.
- Reviews failures, duration, queue time, export state, and audit events.
- Retries recoverable technical steps without duplicating completed model calculations.

### Model owner / data engineer

- Versions model SQL/notebooks and job definitions.
- Publishes model parameter schemas and output contracts.
- Owns data quality checks and performance tuning.

## 4. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Authenticate users through Microsoft Entra ID | Must |
| FR-02 | List models the signed-in user is authorized to run | Must |
| FR-03 | Display model description, owner, version, expected duration, required parameters, and data freshness | Must |
| FR-04 | Validate parameters in both UI and backend | Must |
| FR-05 | Submit a run asynchronously and immediately return an application run ID | Must |
| FR-06 | Show queued, running, exporting, succeeded, failed, and cancelled states | Must |
| FR-07 | Preserve run state when the user closes or refreshes the browser | Must |
| FR-08 | Notify the UI when status changes and provide polling fallback | Must |
| FR-09 | Show all runs visible to the user, with search and filters | Must |
| FR-10 | Show server-paginated tabular output after success | Must |
| FR-11 | Apply server-side sort and approved filters without loading the full dataset | Must |
| FR-12 | Download an XLSX result with one action when the export is ready | Must |
| FR-13 | Support repeated model runs and retain each result independently | Must |
| FR-14 | Surface safe, actionable errors and a support correlation ID | Must |
| FR-15 | Allow an authorized user to cancel a queued/running job when Databricks supports cancellation | Should |
| FR-16 | Show headline metrics and data-quality status alongside detailed rows | Should |
| FR-17 | Offer CSV or Parquet for outputs too large for practical XLSX use | Should |
| FR-18 | Compare selected run metadata and summary metrics | Could |

## 5. Non-functional requirements

### Scale and performance

- Source data: nine million or more rows; design must not impose an application-layer row ceiling.
- Result data: 500,000+ rows; full result transfer to the browser is prohibited.
- Run duration: 12 minutes to two hours; all run APIs must be asynchronous.
- `POST /runs` target: acknowledge accepted requests within five seconds under normal conditions.
- Run list target: first page within two seconds at the 95th percentile, excluding identity-provider latency.
- Result page target: within three seconds at the 95th percentile for indexed/optimized supported queries.
- UI page size: default 100 rows; configurable within an approved range such as 50-500.

### Reliability

- A browser disconnect must not affect a submitted Databricks job.
- Duplicate submission caused by network retry must not create duplicate jobs.
- The system must reconcile status after backend restart or missed notification.
- Output publication must be atomic: users see a completed output only after validation succeeds.

### Security and governance

- No Databricks personal access token, storage key, connection string, or client secret in browser code.
- Least-privilege service identities and group-based authorization.
- Unity Catalog governs input tables, result tables, volumes, lineage, and auditability.
- Sensitive business data must not be placed in logs, URLs, notification payloads, or client telemetry.
- Encryption in transit and at rest is mandatory.

### Usability and accessibility

- Responsive desktop-first experience suitable for data-heavy work; essential status remains usable on tablets.
- WCAG 2.2 AA target: keyboard operation, focus visibility, semantic labels, adequate contrast, and non-color status cues.
- Business language in the UI; infrastructure identifiers are available in a technical details panel, not the primary workflow.

## 6. Scope boundaries

### In scope

- Model catalog and parameter entry.
- Run submission, progress, history, cancellation, and failure display.
- Result summaries, paginated table, and export download.
- Azure-ready identity, API, Databricks integration, security, monitoring, and infrastructure definitions.

### Out of scope for the first POC

- Editing arbitrary SQL in the browser.
- Uploading user code for execution.
- Real-time collaborative editing.
- Rendering all result rows client-side.
- Full actuarial model authoring/version-control UI.
- Cross-cloud deployment.
- Using the application as a permanent document-management system.

## 7. Assumptions

- Azure Databricks and Unity Catalog are available in the target Azure tenant.
- Model logic can be packaged as version-controlled SQL files, notebooks, Python wheels, or jobs.
- Each model exposes a defined parameter schema and stable output contract.
- Entra ID groups can represent application roles.
- Data classification and required retention periods will be supplied before production.
- Private connectivity may be introduced for production even if the POC begins with public endpoints protected by identity and IP/network controls.

## 8. Success measures

- A user can submit a valid model run and leave the application without interrupting it.
- Every accepted request can be traced from application run ID to Databricks run ID and output dataset.
- At least one representative nine-million-row workload completes without browser or API memory pressure.
- A 500,000-row output can be paged, filtered, and downloaded without loading the entire result into the browser.
- Unauthorized users cannot view, run, or download restricted model data.
- Failed runs provide a safe user message and enough correlated telemetry for support diagnosis.

## 9. Requirement decisions still needed

- Exact models, parameter definitions, output columns, and summary metrics for the POC.
- Row-level or model-level access rules by Entra group.
- Data classification, geographic residency, legal hold, and retention periods.
- Whether all users can view all runs or only their own/team runs.
- Maximum practical XLSX size and whether CSV/Parquet is acceptable for very large results.
- Expected concurrent users and concurrent Databricks runs.
- Required recovery objectives and production availability target.

