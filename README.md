# Reinsurance Analytics Workbench

Architecture and delivery documentation for a React-based reinsurance analytics proof of concept integrated with Azure Databricks and Unity Catalog.

> Status: architecture approved in principle; application implementation has not started. Review the open decisions in [docs/07-delivery-roadmap.md](docs/07-delivery-roadmap.md) before development begins.

## Documentation map

| Document | Purpose |
|---|---|
| [01-project-charter.md](docs/01-project-charter.md) | Business goals, scope, personas, requirements, assumptions, and success measures |
| [02-target-architecture.md](docs/02-target-architecture.md) | Recommended Azure architecture, component responsibilities, diagrams, and technology decisions |
| [03-run-and-data-design.md](docs/03-run-and-data-design.md) | Databricks job lifecycle, Unity Catalog layout, result schema, pagination, exports, and retention |
| [04-api-contract.md](docs/04-api-contract.md) | Backend REST API, request/response examples, statuses, errors, idempotency, and authorization |
| [05-security-availability-operations.md](docs/05-security-availability-operations.md) | Security model, threat controls, reliability, observability, recovery, and operational procedures |
| [06-user-experience.md](docs/06-user-experience.md) | Product information architecture, screens, workflows, accessibility, and large-data UI behavior |
| [07-delivery-roadmap.md](docs/07-delivery-roadmap.md) | Delivery phases, test strategy, infrastructure, acceptance criteria, risks, and open decisions |

## Decision summary

- The browser never receives Databricks credentials and never invokes Databricks directly.
- The React UI calls a protected backend REST API using Microsoft Entra ID authentication.
- Long-running model executions use parameterized Databricks Lakeflow Jobs (Databricks Workflows), not synchronous SQL requests.
- Job outputs are durable, immutable Delta tables governed by Unity Catalog and keyed by an application run ID.
- The UI uses server-side pagination, filtering, and sorting. It never loads hundreds of thousands of rows into browser memory.
- XLSX exports are generated asynchronously on the server/Databricks side, stored in a governed volume or Azure Blob Storage, and downloaded through short-lived authorized links.
- Every execution has durable status, ownership, audit details, output references, and error information so multiple runs remain discoverable.
- Azure Functions with Durable Functions is the preferred POC backend. Azure Container Apps is the fallback if export or API workloads exceed function execution/runtime constraints.

## Working agreement for future sessions

Treat these documents as the baseline requirements unless the product owner explicitly changes a decision. Record material changes in the relevant document's decision log and update all affected diagrams, interfaces, security controls, and acceptance criteria together.

