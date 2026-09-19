# User Experience Specification

## 1. Product character

The experience should feel calm, precise, and credible: an executive-quality analytical workbench rather than a marketing site. Information density is appropriate, but hierarchy must make status, model context, and next actions immediately clear. Use a restrained neutral foundation with distinct semantic colors for status and selected data visualization accents; do not rely on color alone.

## 2. Information architecture

```text
Application shell
├── Overview
│   ├── Active runs
│   ├── Recent outcomes
│   └── Headline operational/model metrics
├── Models
│   ├── Model catalog
│   └── New run form
├── Runs
│   ├── Search and filters
│   └── Run detail
│       ├── Summary
│       ├── Results
│       ├── Parameters
│       ├── Timeline
│       └── Downloads
└── Support / user menu
```

## 3. Primary workflows

### Start a run

1. User opens Models and selects an authorized model.
2. The page displays business purpose, owner, version, source freshness, typical duration, and parameters.
3. Parameters use appropriate controls: date/year inputs, searchable multi-select, checkboxes/toggles, numeric fields, and constrained options.
4. Client validation gives immediate field feedback; backend remains authoritative.
5. A review step summarizes choices and indicates that execution can continue after leaving the page.
6. Submit disables only while the request is being acknowledged, preventing accidental double-clicks.
7. The UI routes to run detail as soon as the API returns the run ID.

### Monitor a run

- Header: model name/version, status, requested time/user, elapsed time, and allowed actions.
- Timeline: submitted, queued, running stages, validation, export, completion.
- Progress is stage-based and honest. Do not show made-up percentages.
- Status updates arrive through push and are confirmed by canonical API fetch.
- Closing or refreshing does not lose state.
- Cancellation requires confirmation and explains that cancellation can take time.

### Review results

- Show summary metrics and quality-check status before the detail grid.
- Render a virtualized grid backed by cursor-based pages.
- Keep column headers visible; support column visibility, approved filtering, and sorting.
- Show number/date/currency formats without changing underlying precision.
- Clearly state total validated rows and current filter state.
- Preserve filters in URL-safe application state without placing sensitive values in the URL.
- Empty, loading, query-timeout, and permission-revoked states have explicit treatments.

### Download

- Primary download action shows format, row count, approximate size, and readiness.
- One click requests authorization and begins download when ready.
- If an export is being prepared, show status and allow navigation away.
- If Excel is impractical, explain the available split workbook/CSV/Parquet option in business terms.
- Never imply that the current visible page is the complete export.

### Review run history

- Table columns: run ID short form, model, version, status, requester, submitted, duration, row count, and download state.
- Filters: model, status, date range, and requester/team when authorized.
- Default order: newest first.
- Re-running starts a new run with prefilled parameters after review; it never overwrites the original.

## 4. Recommended screen layout

### Application shell

- Compact left navigation on desktop, accessible drawer on narrow screens.
- Top bar contains page title/context, notification state, and user menu.
- Content width adapts to data grids; avoid placing operational sections inside decorative nested cards.

### Overview

- Active-run table is the primary element.
- A compact metrics band may show active, succeeded today, failed, and median duration.
- Recent completed runs and exceptions follow in scan-friendly tables.
- No oversized hero or promotional copy.

### Run detail

- Stable summary header with status and actions.
- Tabs for Summary, Results, Parameters, Timeline, and Downloads.
- Results uses available horizontal space and a fixed-height/viewport-aware grid.
- Technical identifiers live in a collapsible details area visible to operators.

## 5. Status language

| Internal state | User label | Guidance |
|---|---|---|
| `SUBMITTING` | Submitting | Request is being registered |
| `QUEUED` | Queued | Waiting for Databricks capacity |
| `RUNNING` | Running | Show current named stage and elapsed time |
| `VALIDATING` | Validating results | Quality checks before publication |
| `EXPORTING` | Preparing download | Results may be viewable depending on policy |
| `SUCCEEDED` | Complete | Show completion, row count, results, downloads |
| `SUCCEEDED_WITH_EXPORT_WARNING` | Complete; download issue | Results available; export can be retried |
| `FAILED` | Failed | Safe explanation, correlation ID, next action |
| `CANCELLING` | Cancelling | Disable duplicate cancellation |
| `CANCELLED` | Cancelled | Record who/when where authorized |
| `TIMED_OUT` | Timed out | Explain that processing exceeded its configured limit |

## 6. Large-data grid behavior

- Default 100 rows per server page; configurable within server limits.
- Virtualize DOM rows and columns where the selected grid library supports it.
- Use cursor pagination or controlled infinite scrolling with an accessible page/load-more alternative.
- Debounce text filters and cancel stale requests.
- Show skeleton rows without changing grid dimensions.
- Never derive global totals or aggregations from the currently loaded page.
- Never perform client-side sort/filter while implying it covers the whole dataset.
- Persist column preferences per user only if permitted and version them by result schema.
- Provide copy for selected cells/rows, but avoid a select-all control that suggests all 500,000 rows are in the browser.

## 7. Executive summary design

Model owners define a small, versioned summary contract. Suitable measures might include gross loss, ceded loss, net loss, number of contracts, affected counterparties, exceptions, or quality warnings, but no metric should be invented generically.

Every metric displays:

- label and formatted value;
- unit/currency and valuation context where relevant;
- model/run version and as-of date nearby;
- comparison only when the comparison basis is explicit;
- quality warning when source or calculation checks are incomplete.

Charts are used only where comparison or distribution is clearer than a table. They operate on pre-aggregated summary data, never raw 500,000-row browser datasets.

## 8. Accessibility

- Full keyboard navigation, including model form, tabs, dialogs, table controls, and download actions.
- Visible focus indicator and logical focus order.
- Icons have accessible names/tooltips; icon-only buttons use familiar symbols.
- Status includes text/icon, not only color.
- Live region announces meaningful run-state changes without announcing every poll.
- Grid supplies semantic labels and an accessible alternative if the chosen virtualization library limits screen-reader navigation.
- Error summary links to invalid fields; focus moves appropriately after failed submission.
- Dates, numbers, and currency are localized for display while API values remain canonical.
- Respect reduced motion and avoid nonessential animation.

## 9. Responsive behavior

The analytical grid is desktop-first. On smaller screens:

- navigation collapses;
- summary measures wrap into compact rows;
- run history prioritizes status/model/time and exposes remaining fields in a detail view;
- result columns can scroll horizontally with frozen key columns;
- primary actions remain visible without overlapping content;
- no text or status badge is truncated without an accessible full label.

## 10. UI implementation candidates

Final selection should match the repository and licensing policy. Expected capabilities:

- React with TypeScript and a current supported build tool/framework.
- MSAL React for Entra authentication.
- TanStack Query for server state, retries, cancellation, and cache invalidation.
- A proven enterprise data grid with server-side/cursor support and virtualization (for example AG Grid under an approved license, or TanStack Table plus TanStack Virtual).
- React Hook Form plus a schema validator for dynamic parameter forms.
- A tested accessible component system and Lucide icons, aligned with enterprise branding.

Do not hand-roll authentication, grid virtualization, date parsing, or spreadsheet generation.

