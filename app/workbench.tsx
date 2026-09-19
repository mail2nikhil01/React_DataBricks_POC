"use client";

import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Bell, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Database, Download,
  FileSpreadsheet, Filter, Gauge, History, Home, Layers3, Menu,
  MoreHorizontal, Play, Plus, RefreshCw, Search, Settings, ShieldCheck,
  SlidersHorizontal, Table2, X, XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "overview" | "models" | "runs";
type RunStatus = "Running" | "Complete" | "Failed" | "Queued";
type Run = { id: string; model: string; version: string; status: RunStatus; requested: string; duration: string; rows: string; stage?: string };

const initialRuns: Run[] = [
  { id: "RUN-2847", model: "Portfolio Loss Allocation", version: "v3.4", status: "Running", requested: "Today, 09:42", duration: "38m", rows: "--", stage: "Applying treaty conditions" },
  { id: "RUN-2846", model: "Aggregate Exposure", version: "v2.1", status: "Complete", requested: "Today, 08:15", duration: "1h 12m", rows: "527,318" },
  { id: "RUN-2845", model: "Catastrophe Recovery", version: "v4.0", status: "Complete", requested: "Yesterday, 16:31", duration: "47m", rows: "184,092" },
  { id: "RUN-2844", model: "Treaty Performance", version: "v1.8", status: "Failed", requested: "Yesterday, 14:08", duration: "12m", rows: "--" },
  { id: "RUN-2843", model: "Portfolio Loss Allocation", version: "v3.4", status: "Complete", requested: "18 Sep, 11:24", duration: "1h 34m", rows: "612,804" },
];

const models = [
  { name: "Portfolio Loss Allocation", version: "v3.4", description: "Allocates gross losses across treaty layers and participating cedants.", duration: "45-110 min", updated: "18 Sep 2026", tone: "green", icon: Layers3 },
  { name: "Aggregate Exposure", version: "v2.1", description: "Consolidates exposure by region, peril and underwriting year.", duration: "35-80 min", updated: "15 Sep 2026", tone: "blue", icon: BarChart3 },
  { name: "Catastrophe Recovery", version: "v4.0", description: "Calculates recoveries across occurrence and aggregate protections.", duration: "40-95 min", updated: "12 Sep 2026", tone: "amber", icon: Activity },
  { name: "Treaty Performance", version: "v1.8", description: "Reviews loss ratios, premium development and treaty performance.", duration: "20-55 min", updated: "08 Sep 2026", tone: "red", icon: Gauge },
];

const resultRows = Array.from({ length: 48 }, (_, index) => {
  const cedants = ["Meridian Assurance", "Northbridge Mutual", "Horizon General", "Atlas Risk Partners", "Crown Pacific Re", "Stonehaven Group"];
  const regions = ["APAC", "Europe", "North America", "LATAM"];
  const layers = ["Primary", "First Excess", "Second Excess", "Aggregate"];
  const gross = 2_140_000 + ((index * 791_341) % 12_800_000);
  const ceded = Math.round(gross * (0.31 + (index % 5) * 0.055));
  return { id: `PL-${41082 + index}`, cedant: cedants[index % 6], region: regions[index % 4], year: 2022 + (index % 4), layer: layers[index % 4], gross, ceded, net: gross - ceded };
});

const nav = [
  { id: "overview" as View, label: "Overview", icon: Home },
  { id: "models" as View, label: "Models", icon: Layers3 },
  { id: "runs" as View, label: "Run history", icon: History },
];

function Status({ value }: { value: RunStatus }) {
  return <span className={`status status-${value.toLowerCase()}`}><span />{value}</span>;
}

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function Workbench() {
  const [view, setView] = useState<View>("overview");
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [showLauncher, setShowLauncher] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [modelName, setModelName] = useState(models[0].name);
  const pageSize = 8;

  useEffect(() => {
    const saved = window.localStorage.getItem("aurelis-demo-runs");
    if (saved) setRuns(JSON.parse(saved));
  }, []);
  useEffect(() => { window.localStorage.setItem("aurelis-demo-runs", JSON.stringify(runs)); }, [runs]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3200); return () => window.clearTimeout(timer); }, [toast]);

  const filteredRows = useMemo(() => resultRows.filter((row) => `${row.id} ${row.cedant} ${row.region} ${row.layer}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  function launchRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const model = models.find((item) => item.name === modelName) ?? models[0];
    const newRun: Run = { id: `RUN-${2848 + runs.length}`, model: model.name, version: model.version, status: "Queued", requested: "Just now", duration: "<1m", rows: "--", stage: "Waiting for compute" };
    setRuns((current) => [newRun, ...current]); setShowLauncher(false); setSelectedRun(newRun); setView("runs"); setToast(`${newRun.id} submitted successfully`);
    window.setTimeout(() => {
      setRuns((current) => current.map((run) => run.id === newRun.id ? { ...run, status: "Running", stage: "Preparing governed inputs", duration: "1m" } : run));
      setSelectedRun((run) => run?.id === newRun.id ? { ...run, status: "Running", stage: "Preparing governed inputs", duration: "1m" } : run);
    }, 2600);
  }

  function openRun(run: Run) { setSelectedRun(run); setView("runs"); }
  function downloadSample() {
    const headers = ["Policy ID", "Cedant", "Region", "Underwriting Year", "Layer", "Gross Loss", "Ceded Loss", "Net Loss"];
    const lines = resultRows.map((row) => [row.id, row.cedant, row.region, row.year, row.layer, row.gross, row.ceded, row.net].join(","));
    const url = URL.createObjectURL(new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "portfolio-loss-allocation-sample.csv"; link.click(); URL.revokeObjectURL(url); setToast("Sample export downloaded");
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><span>A</span></span><div><strong>AURELIS</strong><small>REINSURANCE</small></div></div>
      <button className="icon-button close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button>
      <nav aria-label="Primary navigation">
        <p className="nav-label">WORKSPACE</p>
        {nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setSelectedRun(null); setMobileNav(false); }}><item.icon size={18} /><span>{item.label}</span>{item.id === "runs" && <em>{runs.length}</em>}</button>)}
        <p className="nav-label nav-section">MANAGE</p><button><Database size={18} /><span>Data sources</span></button><button><ShieldCheck size={18} /><span>Governance</span></button>
      </nav>
      <div className="sidebar-foot"><button><CircleHelp size={18} /><span>Support</span></button><button><Settings size={18} /><span>Settings</span></button><div className="identity"><span>NS</span><div><strong>Nikheel Sharma</strong><small>Reinsurance Analytics</small></div><ChevronDown size={16} /></div></div>
    </aside>

    <main><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="environment"><span /> Demo environment</div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button><button className="avatar" aria-label="User menu">NS</button></div></header>
      {view === "overview" && <Overview runs={runs} onNew={() => setShowLauncher(true)} onRun={openRun} onViewAll={() => setView("runs")} />}
      {view === "models" && <Models onLaunch={(name) => { setModelName(name); setShowLauncher(true); }} />}
      {view === "runs" && (selectedRun ? <RunDetail run={runs.find((item) => item.id === selectedRun.id) ?? selectedRun} onBack={() => setSelectedRun(null)} query={query} setQuery={(value) => { setQuery(value); setPage(1); }} rows={visibleRows} page={page} pageCount={pageCount} total={filteredRows.length} setPage={setPage} onDownload={downloadSample} /> : <RunHistory runs={runs} onRun={openRun} onNew={() => setShowLauncher(true)} />)}
    </main>
    {showLauncher && <RunLauncher selected={modelName} setSelected={setModelName} onClose={() => setShowLauncher(false)} onSubmit={launchRun} />}
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
  </div>;
}

function Overview({ runs, onNew, onRun, onViewAll }: { runs: Run[]; onNew: () => void; onRun: (run: Run) => void; onViewAll: () => void }) {
  const active = runs.filter((run) => run.status === "Running" || run.status === "Queued").length;
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">FRIDAY, 19 SEPTEMBER</p><h1>Good morning, Nikheel</h1><p>Your reinsurance analytics workspace is up to date.</p></div><button className="primary-button" onClick={onNew}><Plus size={18} /> New model run</button></div>
    <section className="metric-row" aria-label="Run summary">
      <Metric icon={Activity} tone="green" label="ACTIVE RUNS" value={String(active)} note="1 running now" />
      <Metric icon={CheckCircle2} tone="blue" label="COMPLETED TODAY" value="7" note="+2 vs. yesterday" />
      <Metric icon={Clock3} tone="amber" label="MEDIAN DURATION" value="48m" note="Last 30 runs" />
      <Metric icon={XCircle} tone="red" label="FAILED RUNS" value="1" note="Action needed" />
    </section>
    <section className="content-grid"><div className="panel active-panel"><SectionHead title="Active runs" sub="Live model execution status" action={<button className="text-button" onClick={onViewAll}>View all <ArrowRight size={16} /></button>} />
      <div className="active-run" onClick={() => onRun(runs[0])} role="button" tabIndex={0}><div className="run-symbol"><RefreshCw size={21} /></div><div className="run-main"><div><strong>Portfolio Loss Allocation</strong><span>RUN-2847</span></div><p>Applying treaty conditions</p><div className="progress"><span /></div><small>Started 38 minutes ago</small></div><Status value="Running" /><ChevronRight size={18} /></div><div className="empty-active"><Check size={18} /><span>No other models are waiting for compute.</span></div>
      </div><div className="panel capacity-panel"><SectionHead title="Compute capacity" sub="Databricks job availability" action={<button className="icon-button" aria-label="More capacity options"><MoreHorizontal size={19} /></button>} /><div className="capacity"><div className="ring"><span>62%</span></div><div><strong>Healthy</strong><p>5 of 8 job slots available</p><small><i /> SQL warehouse online</small></div></div><div className="capacity-foot"><span>Average queue time</span><strong>2m 14s</strong></div></div></section>
    <section className="panel recent-panel"><SectionHead title="Recent runs" sub="Your latest model activity" action={<button className="filter-button"><SlidersHorizontal size={16} /> Filter</button>} /><RunTable runs={runs.slice(0, 5)} onRun={onRun} /></section>
    <section className="insight-strip"><span><ShieldCheck size={20} /></span><div><strong>All governed data is current</strong><p>Unity Catalog sources were last validated today at 09:30 UTC.</p></div><button>View data health <ArrowRight size={15} /></button></section>
  </div>;
}

function Metric({ icon: Icon, tone, label, value, note }: { icon: typeof Activity; tone: string; label: string; value: string; note: string }) {
  return <article><span className={`metric-icon ${tone}`}><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

function SectionHead({ title, sub, action }: { title: string; sub: string; action: React.ReactNode }) {
  return <div className="section-head"><div><h2>{title}</h2><p>{sub}</p></div>{action}</div>;
}

function Models({ onLaunch }: { onLaunch: (name: string) => void }) {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">MODEL CATALOG</p><h1>Reinsurance models</h1><p>Select a governed model to configure and run.</p></div></div><div className="model-grid">{models.map((model) => <article className="model-card" key={model.name}><div className={`model-icon ${model.tone}`}><model.icon size={23} /></div><div className="model-title"><h2>{model.name}</h2><span>{model.version}</span></div><p>{model.description}</p><dl><div><dt>Typical duration</dt><dd>{model.duration}</dd></div><div><dt>Last updated</dt><dd>{model.updated}</dd></div></dl><button className="secondary-button" onClick={() => onLaunch(model.name)}><Play size={16} /> Configure run</button></article>)}</div></div>;
}

function RunHistory({ runs, onRun, onNew }: { runs: Run[]; onRun: (run: Run) => void; onNew: () => void }) {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">EXECUTION HISTORY</p><h1>Model runs</h1><p>Review status, ownership and output across every execution.</p></div><button className="primary-button" onClick={onNew}><Plus size={18} /> New model run</button></div><section className="panel recent-panel"><div className="table-toolbar"><label><Search size={17} /><input placeholder="Search run or model" /></label><button className="filter-button"><Filter size={16} /> Status: All</button><button className="filter-button"><Clock3 size={16} /> Last 30 days</button></div><RunTable runs={runs} onRun={onRun} /></section></div>;
}

function RunTable({ runs, onRun }: { runs: Run[]; onRun: (run: Run) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Run</th><th>Model</th><th>Status</th><th>Requested</th><th>Duration</th><th>Output rows</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} onClick={() => onRun(run)}><td><strong className="mono">{run.id}</strong></td><td><strong>{run.model}</strong><small>{run.version}</small></td><td><Status value={run.status} /></td><td>{run.requested}</td><td>{run.duration}</td><td>{run.rows}</td><td><ChevronRight size={17} /></td></tr>)}</tbody></table></div>;
}

function RunDetail({ run, onBack, query, setQuery, rows, page, pageCount, total, setPage, onDownload }: { run: Run; onBack: () => void; query: string; setQuery: (v: string) => void; rows: typeof resultRows; page: number; pageCount: number; total: number; setPage: (v: number) => void; onDownload: () => void }) {
  const complete = run.status === "Complete";
  return <div className="page run-detail"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> All runs</button><div className="run-heading"><div><div className="run-title"><h1>{run.model}</h1><Status value={run.status} /></div><p><span className="mono">{run.id}</span> / {run.version} / Requested {run.requested}</p></div>{complete && <button className="primary-button" onClick={onDownload}><Download size={18} /> Download sample</button>}</div>
    {!complete ? <Execution run={run} /> : <><section className="metric-row result-metrics"><Metric icon={Activity} tone="green" label="GROSS LOSS" value="$1.84B" note="Across 527,318 records" /><Metric icon={Activity} tone="blue" label="CEDED LOSS" value="$726.4M" note="39.5% recovery ratio" /><Metric icon={Activity} tone="amber" label="NET LOSS" value="$1.11B" note="After treaty allocation" /><Metric icon={CheckCircle2} tone="green" label="QUALITY CHECKS" value="Passed" note="12 of 12 controls" /></section>
      <section className="panel results-panel"><div className="section-head results-head"><div><h2>Detailed results</h2><p>527,318 validated rows / values in USD</p></div><div className="result-tools"><label><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search current demo data" /></label><button className="icon-button bordered" aria-label="Filter result columns"><Filter size={17} /></button><button className="icon-button bordered" aria-label="Choose visible columns"><Table2 size={17} /></button></div></div><div className="table-wrap results-table"><table><thead><tr><th>Policy ID</th><th>Cedant</th><th>Region</th><th>UW year</th><th>Layer</th><th className="numeric">Gross loss</th><th className="numeric">Ceded loss</th><th className="numeric">Net loss</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="mono">{row.id}</td><td><strong>{row.cedant}</strong></td><td>{row.region}</td><td>{row.year}</td><td>{row.layer}</td><td className="numeric">{money(row.gross)}</td><td className="numeric ceded">{money(row.ceded)}</td><td className="numeric">{money(row.net)}</td></tr>)}</tbody></table></div><div className="pagination"><span>Showing {total ? (page - 1) * 8 + 1 : 0}-{Math.min(page * 8, total)} of {total} demo rows</span><div><button className="icon-button bordered" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ArrowLeft size={16} /></button><span>Page {page} of {pageCount}</span><button className="icon-button bordered" disabled={page === pageCount} onClick={() => setPage(page + 1)} aria-label="Next page"><ArrowRight size={16} /></button></div></div></section>
      <section className="export-bar"><FileSpreadsheet size={24} /><div><strong>Full result export</strong><p>XLSX generation will connect to the governed Databricks artifact. This demo downloads the visible sample as CSV.</p></div><button className="secondary-button" onClick={onDownload}><Download size={17} /> Download CSV sample</button></section></>}
  </div>;
}

function Execution({ run }: { run: Run }) {
  return <section className="execution-panel"><div className="execution-icon"><RefreshCw size={24} /></div><div><p className="eyebrow">CURRENT STAGE</p><h2>{run.stage ?? "Waiting for compute"}</h2><p>This model continues running if you leave this page. Status will refresh automatically.</p><div className="stage-track"><span /><span className="active" /><span /><span /><span /></div><div className="stage-labels"><span>Submitted</span><span>Preparing inputs</span><span>Model logic</span><span>Validation</span><span>Export</span></div></div><dl><div><dt>Elapsed</dt><dd>{run.duration}</dd></div><div><dt>Expected</dt><dd>45-110 min</dd></div></dl></section>;
}

function RunLauncher({ selected, setSelected, onClose, onSubmit }: { selected: string; setSelected: (v: string) => void; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-layer"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="launcher-title"><div className="modal-head"><div><p className="eyebrow">NEW EXECUTION</p><h2 id="launcher-title">Configure model run</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><form onSubmit={onSubmit}><label className="field"><span>Model</span><select value={selected} onChange={(e) => setSelected(e.target.value)}>{models.map((model) => <option key={model.name}>{model.name}</option>)}</select></label><div className="field-row"><label className="field"><span>Underwriting year from</span><select defaultValue="2022"><option>2021</option><option>2022</option><option>2023</option><option>2024</option></select></label><label className="field"><span>Underwriting year to</span><select defaultValue="2025"><option>2023</option><option>2024</option><option>2025</option><option>2026</option></select></label></div><label className="field"><span>Region scope</span><select defaultValue="All regions"><option>All regions</option><option>APAC</option><option>Europe</option><option>North America</option><option>LATAM</option></select></label><label className="check-field"><input type="checkbox" defaultChecked /><span><strong>Include facultative contracts</strong><small>Include eligible facultative placements in the allocation.</small></span></label><div className="run-note"><Clock3 size={18} /><div><strong>Expected duration: 45-110 minutes</strong><p>You can close the application after submitting. The run will continue in the background.</p></div></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Play size={17} /> Submit run</button></div></form></div></div>;
}
