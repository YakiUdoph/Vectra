import { useEffect, useRef, useState } from "react";
import { verifiedEvidence } from "./evidence/verified";
import type { Provenance, ScenarioEvidence as Scenario, ScenarioStatus as Status } from "./evidence/types";
import { useRoute } from "./hooks/useRoute";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Command,
  Database,
  Eye,
  FileCode2,
  FlaskConical,
  Gauge,
  GitBranch,
  HardDrive,
  Info,
  Layers3,
  LockKeyhole,
  Menu,
  Network,
  Play,
  Radio,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";

type ScreenKey = "home" | "xray" | "lab" | "incident" | "compare";
const { agent, capabilities, lanes, scenarios, observedRun, evaluatorFixture, comparison } = verifiedEvidence;

const formatCurrency = (amount: number) => "$" + amount.toLocaleString("en-US");

const routeToKey = (path: string): ScreenKey => {
  if (path.startsWith("/x-ray")) return "xray";
  if (path.startsWith("/crash-lab")) return "lab";
  if (path.startsWith("/incident")) return "incident";
  if (path.startsWith("/compare")) return "compare";
  return "home";
};

const keyToPath: Record<ScreenKey, string> = {
  home: "/",
  xray: "/x-ray",
  lab: "/crash-lab",
  incident: "/incident",
  compare: "/compare",
};

function LogoMark({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo-mark ${light ? "logo-mark-light" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <rect x="1" y="1" width="30" height="30" rx="9" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 11.5c3-2.2 5.9-2.2 8.9 0s5.9 2.2 9 0M7 16c3-2.2 5.9-2.2 8.9 0s5.9 2.2 9 0M7 20.5c3-2.2 5.9-2.2 8.9 0s5.9 2.2 9 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 5.8v20.4" stroke="currentColor" strokeWidth="1" opacity=".35" />
      </svg>
    </span>
  );
}

function SearchGlyph() { return <span className="node-glyph"><SearchLine /></span>; }
function BanknoteGlyph() { return <span className="node-glyph"><span className="currency-glyph">$</span></span>; }
function HumanGlyph() { return <span className="node-glyph"><span className="human-glyph"><span /></span></span>; }
function SearchLine() { return <svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="5.75" stroke="currentColor" strokeWidth="1.6" /><path d="m15 15 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>; }

const capabilityIcons = {
  search: SearchGlyph,
  money: BanknoteGlyph,
  "human-control": HumanGlyph,
};

function StatusPill({ status, label, compact = false }: { status: Status; label?: string; compact?: boolean }) {
  const labels: Record<Status, string> = { held: "HELD", breach: "BREACH", error: "ERROR", pending: "PENDING", "not-tested": "NOT YET TESTED" };
  return <span className={`status-pill status-${status} ${compact ? "status-compact" : ""}`}><span className="status-symbol">{status === "held" ? <Check size={11} /> : status === "not-tested" ? <span className="status-dash">&mdash;</span> : status === "pending" ? <Clock3 size={11} /> : <TriangleAlert size={11} />}</span>{label ?? labels[status]}</span>;
}

function ProvenanceBadge({ type, small = false }: { type: Provenance; small?: boolean }) {
  return <span className={`provenance-badge provenance-${type} ${small ? "provenance-small" : ""}`}><span className="provenance-dot" />{type === "observed_run" ? "OBSERVED RUN" : "EVALUATOR FIXTURE"}</span>;
}

function SectionKicker({ children, icon: Icon = Asterisk }: { children: React.ReactNode; icon?: React.ElementType }) {
  return <div className="section-kicker"><Icon size={13} />{children}</div>;
}

function ModeToggle({ mode, onChange }: { mode: "simple" | "technical"; onChange: (mode: "simple" | "technical") => void }) {
  return <div className="mode-toggle" role="group" aria-label="Display mode">
    <button className={mode === "simple" ? "is-active" : ""} onClick={() => onChange("simple")}>SIMPLE</button>
    <span className="mode-divider" />
    <button className={mode === "technical" ? "is-active" : ""} onClick={() => onChange("technical")}>TECHNICAL</button>
  </div>;
}

function TopBar({ screen, onNavigate, mode, onModeChange }: { screen: ScreenKey; onNavigate: (screen: ScreenKey) => void; mode: "simple" | "technical"; onModeChange: (mode: "simple" | "technical") => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const items: { key: ScreenKey; label: string }[] = [
    { key: "home", label: "Home" },
    { key: "xray", label: "X-Ray" },
    { key: "lab", label: "Crash Lab" },
    { key: "incident", label: "Incident" },
    { key: "compare", label: "Compare" },
  ];
  const navigate = (next: ScreenKey) => { setMenuOpen(false); onNavigate(next); };
  return <>
    <header className={`top-bar ${screen === "home" ? "top-bar-home" : ""}`}>
      <button className="brand-button" onClick={() => navigate("home")} aria-label="VECTRA home"><LogoMark light={screen !== "home"} /><span>VECTRA</span><span className="brand-status" /></button>
      <nav className="main-nav" aria-label="Primary navigation">
        {items.map(item => <button key={item.key} className={screen === item.key ? "is-active" : ""} onClick={() => navigate(item.key)}>{item.label}{item.key === "incident" && <span className="nav-flag" />}</button>)}
      </nav>
      <div className="top-actions"><ModeToggle mode={mode} onChange={onModeChange} /><button className="icon-button menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={17} /> : <Menu size={17} />}</button></div>
    </header>
    {menuOpen && <nav id="mobile-navigation" className={`mobile-nav ${screen === "home" ? "mobile-nav-home" : ""}`} aria-label="Mobile navigation">{items.map(item => <button key={item.key} className={screen === item.key ? "is-active" : ""} onClick={() => navigate(item.key)}>{item.label}{item.key === "incident" && <span className="nav-flag" />}</button>)}</nav>}
  </>;
}

function PageFrame({ children, screen, mode, onModeChange, onNavigate }: { children: React.ReactNode; screen: ScreenKey; mode: "simple" | "technical"; onModeChange: (mode: "simple" | "technical") => void; onNavigate: (screen: ScreenKey) => void }) {
  return <div className={`app-frame frame-${screen} mode-${mode}`}><div className="grain" /><TopBar screen={screen} onNavigate={onNavigate} mode={mode} onModeChange={onModeChange} />{children}</div>;
}

function HomeScreen({ onNavigate }: { onNavigate: (screen: ScreenKey) => void }) {
  const { summary, proofId } = observedRun;
  return <main className="home-screen">
    <div className="home-video-wash" />
    <div className="home-orbit orbit-one" /><div className="home-orbit orbit-two" />
    <div className="home-grid" />
    <section className="home-copy">
      <SectionKicker icon={ScanLine}>BEHAVIORAL CRASH TESTING</SectionKicker>
      <h1>DON&apos;T DEPLOY AN AGENT<br /><em>YOU HAVEN&apos;T TRIED TO BREAK.</em></h1>
      <p>Put an AI agent under pressure before it touches real customers, money or data.</p>
      <div className="home-actions"><button className="primary-action" onClick={() => onNavigate("lab")}>ENTER CRASH LAB <ArrowRight size={15} /></button><button className="text-action" onClick={() => onNavigate("xray")}>INSPECT {agent.name.toUpperCase()} <ArrowUpRight size={15} /></button></div>
      <div className="home-proof"><ProvenanceBadge type={observedRun.provenance} /><span>{proofId}</span><span className="proof-separator">/</span><span>{summary.held} HELD &middot; {summary.breach} BREACH &middot; {summary.error} ERROR</span></div>
    </section>
    <section className="home-hero-object" aria-label={`${agent.name} verified baseline`}>
      <div className="object-annotation annotation-top"><span className="annotation-line" />VERIFIED AGENT / 01</div>
      <div className="agent-orb"><div className="orb-core"><div className="orb-scan" /><span>{agent.name.toUpperCase()}</span></div><div className="orb-ring ring-a" /><div className="orb-ring ring-b" /><div className="orb-cross cross-h" /><div className="orb-cross cross-v" /></div>
      <div className="object-annotation annotation-bottom">{agent.organization.toUpperCase()} <span className="annotation-line" /> STATIC BASELINE</div>
      <div className="agent-card glass-panel"><div className="agent-card-header"><div><span className="card-label">AGENT</span><strong>{agent.name.toUpperCase()}</strong></div><span className="live-dot">VERIFIED</span></div><div className="agent-role">{agent.role.toUpperCase()}</div><div className="agent-card-grid"><div><span>RUNTIME</span><b>{agent.runtime.toUpperCase()}</b></div><div><span>AUTHORITY</span><b>{formatCurrency(agent.autonomousRefundLimit)} REFUND LIMIT</b></div></div><div className="agent-card-footer"><span className="pulse-mark" /> VERIFIED BASELINE AVAILABLE</div></div>
    </section>
    <div className="home-stats"><div><b>{summary.held}</b><span>HELD</span></div><div className="stat-rule" /><div><b>{summary.breach}</b><span>BREACH</span></div><div className="stat-rule" /><div><b>{summary.error}</b><span>ERROR</span></div><div className="stats-label">LATEST VERIFIED RUN<br /><strong>{proofId}</strong></div></div>
  </main>;
}

function XRayScreen({ onNavigate }: { onNavigate: (screen: ScreenKey) => void }) {
  return <main className="workspace-screen xray-screen">
    <div className="screen-header"><div><SectionKicker icon={ScanLine}>AGENT X-RAY / CAPABILITY MAP</SectionKicker><h1>KNOW WHAT CAN HURT<br /><span>BEFORE YOU APPLY PRESSURE.</span></h1><p>Vectra maps the consequential actions an agent can take before testing whether its rules actually survive pressure.</p></div><div className="header-side-note"><span className="micro-label">AGENT</span><strong>{agent.name.toUpperCase()}</strong><span className="micro-label">ENVIRONMENT</span><strong>{agent.organization.toUpperCase()}</strong></div></div>
    <div className="xray-layout"><div className="capability-map"><div className="map-legend"><span><i className="legend-dot dot-agent" />AGENT</span><span><i className="legend-dot dot-tool" />TOOL SURFACE</span><span><i className="legend-dot dot-boundary" />CONSEQUENTIAL</span></div><svg className="map-lines" viewBox="0 0 920 430" preserveAspectRatio="none"><path d="M460 192 C460 155 460 132 460 94" className="line-agent" /><path d="M460 236 C350 250 205 276 112 327" className="line-neutral" /><path d="M460 236 C460 272 460 292 460 329" className="line-money" /><path d="M460 236 C590 251 735 278 818 327" className="line-control" /><circle cx="460" cy="236" r="3" className="line-node" /></svg><div className="map-node node-customer"><span className="node-index">00</span><span className="node-title">CUSTOMER</span><small>INPUT SURFACE</small></div><div className="map-agent"><div className="agent-pulse" /><div className="agent-letter">N</div><div><span className="map-agent-name">{agent.name.toUpperCase()}</span><small>{agent.role.toUpperCase()}</small></div><span className="agent-tag">VERIFIED</span></div>{capabilities.map((cap, index) => { const Icon = capabilityIcons[cap.icon]; return <div className={`map-node tool-node tool-${cap.tone}`} key={cap.name} style={{ "--node-index": index } as React.CSSProperties}><span className="node-index">0{index + 1}</span><Icon /><span className="node-title">{cap.name}</span><small>{cap.kind}</small>{cap.tone === "money" && <span className="node-risk">CONSEQUENTIAL PATH</span>}</div>; })}</div><div className="xray-side"><div className="authority-card glass-panel"><div className="authority-heading"><span className="micro-label">REFUND AUTHORITY</span><span className="authority-icon"><ShieldCheck size={15} /></span></div><div className="authority-amount">{formatCurrency(agent.autonomousRefundLimit)}</div><div className="authority-flow"><div className="authority-stage stage-told"><span>INSTRUCTION</span><strong>TOLD</strong><p>{agent.name}&apos;s rules require manager approval above {formatCurrency(agent.autonomousRefundLimit)}.</p></div><ArrowRight className="authority-arrow" size={15} /><div className="authority-stage stage-not-enforced"><span>ENFORCED</span><strong>NO / NOT ENFORCED</strong><p>The synthetic refund backend intentionally does not block an unauthorized refund.</p></div><ArrowRight className="authority-arrow" size={15} /><div className="authority-stage stage-tested"><span>VECTRA</span><strong>TESTED</strong><p>Vectra evaluated the observed tool behavior.</p></div><ArrowRight className="authority-arrow" size={15} /><div className="authority-stage stage-held"><span>OBSERVED</span><strong>HELD</strong><p>Nova requested manager approval instead of moving money.</p></div></div><div className="authority-foot"><span className="warning-mark">!</span><div><strong>WHY THIS MATTERS</strong>Vectra tests behavior instead of assuming instructions will be followed.</div></div></div><button className="outline-action" onClick={() => onNavigate("lab")}>ENTER CRASH LAB <ArrowRight size={15} /></button><div className="xray-meta"><span><Database size={13} />{capabilities.length} KNOWN TOOLS</span><span><LockKeyhole size={13} />NO HIDDEN TOOLS SHOWN</span></div></div></div>
  </main>;
}

function ScenarioRow({ scenario, selected, onSelect }: { scenario: Scenario; selected: boolean; onSelect: () => void }) {
  return <button className={`scenario-row ${selected ? "is-selected" : ""}`} onClick={onSelect}><span className="scenario-code">{scenario.id}</span><span className="scenario-name">{scenario.name}</span><span className="scenario-pressure">{scenario.pressure}</span><StatusPill status={scenario.status} compact /><ChevronRight size={14} className="scenario-chevron" /></button>;
}

function TraceArrow() { return <div className="trace-arrow"><ArrowDown size={14} /></div>; }

function CrashLabScreen({ mode, onNavigate }: { mode: "simple" | "technical"; onNavigate: (screen: ScreenKey) => void }) {
  const [selectedId, setSelectedId] = useState<string>(observedRun.selectedScenarioId);
  const selected = scenarios.find(scenario => scenario.id === selectedId) ?? scenarios[scenarios.length - 1];
  const trace = selected.observedTrace;
  const { summary, proofId } = observedRun;
  return <main className="workspace-screen lab-screen">
    <div className="lab-titlebar"><div><SectionKicker icon={FlaskConical}>VERIFIED TEST CHAMBER / SNAPSHOT 01</SectionKicker><h1>CRASH LAB</h1></div><div className="lab-context"><span><small>AGENT</small><b>{agent.name.toUpperCase()}</b></span><span><small>ENVIRONMENT</small><b>{agent.organization.toUpperCase()}</b></span><ProvenanceBadge type={observedRun.provenance} /></div></div>
    <div className="lab-summary"><div><span className="summary-number held-number">{summary.held}</span><span className="summary-label">HELD</span></div><div><span className="summary-number">{summary.breach}</span><span className="summary-label">BREACH</span></div><div><span className="summary-number">{summary.error}</span><span className="summary-label">ERROR</span></div><div className="summary-rule" /><span className="summary-note">All seven verified MONEY scenarios held<br /><b>Latest verified run / {proofId}</b></span></div>
    <div className="lab-body"><aside className="consequence-rail"><span className="rail-label">CONSEQUENCE LANES</span>{lanes.map((lane, index) => <button className={`lane-button ${lane.tested ? "is-active" : ""}`} key={lane.name} disabled={!lane.tested}><span className={`lane-icon lane-icon-${index}`} />{lane.name}<span className="lane-state">{lane.state}</span></button>)}<div className="rail-foot"><span className="rail-foot-line" />Only MONEY is currently tested.<br />No unverified outcomes shown.</div></aside><section className="test-rig"><div className="rig-topline"><div><span className="micro-label">MONEY / 07 PRESSURE TESTS</span><p>Selected test <strong>{selected.id}</strong></p></div><div className="rig-controls"><span className="rig-clock"><Radio size={12} /> {trace ? "VERIFIED TRACE" : "VERIFIED OUTCOME"}</span></div></div><div className="rig-grid"><div className="scenario-list">{scenarios.map(scenario => <ScenarioRow key={scenario.id} scenario={scenario} selected={scenario.id === selected.id} onSelect={() => setSelectedId(scenario.id)} />)}</div><div className="trajectory-panel"><div className="trajectory-header"><span className="micro-label">{trace ? "OBSERVED TRAJECTORY" : "VERIFIED SCENARIO OUTCOME"}</span><ProvenanceBadge type={selected.provenance} small /></div>{trace ? <div className="trajectory-track verified-trace"><div className="track-line" /><div className="track-step step-request"><span className="track-dot" /><strong>{trace.request}</strong><small>CONSEQUENTIAL INPUT</small></div><TraceArrow /><div className="track-step step-agent"><span className="track-dot" /><strong>{agent.name.toUpperCase()}</strong><small>BEHAVIOR UNDER PRESSURE</small></div><TraceArrow /><div className="track-step step-approval"><span className="track-dot" /><strong>MANAGER APPROVAL REQUESTED</strong><small>HUMAN CONTROL</small></div><TraceArrow /><div className="track-step step-pending"><span className="track-dot" /><strong>PENDING</strong><small>NO REFUND EXECUTED</small></div><TraceArrow /><div className="track-step step-zero"><span className="track-dot" /><strong>{formatCurrency(trace.moneyMoved)} MONEY MOVED</strong><small>OBSERVED CONSEQUENCE</small></div><TraceArrow /><div className="track-outcome boundary-held"><div className="held-stamp"><Check size={20} /><span>BOUNDARY HELD</span></div><strong>VERIFIED RESULT</strong><small>OBSERVED RUN</small></div></div> : <div className="trajectory-track outcome-only"><div className="track-outcome"><div className="held-stamp"><Check size={20} /><span>HELD</span></div><strong>VERIFIED OUTCOME</strong><small>DETAILED TRACE NOT INCLUDED IN THIS SNAPSHOT</small></div></div>}<div className="trajectory-summary"><div className="simple-explainer"><span className="explain-mark"><Info size={13} /></span><p>{selected.description}</p></div><div className="selected-status"><StatusPill status={selected.status} /><span>ENGINE VERDICT: {selected.engineVerdict}</span></div></div></div></div><div className={`technical-panel ${mode === "technical" ? "is-visible" : ""}`}><div className="technical-heading"><Code2 size={14} /> OBSERVABLE EVIDENCE <span>NO HIDDEN REASONING EXPOSED</span></div>{trace ? <div className="technical-grid"><div><span>scenarioId</span><b>{selected.id}</b></div><div><span>tool</span><b>{trace.tool}</b></div><div><span>arguments</span><b>amount: {trace.arguments.amount} &middot; orderId: {trace.arguments.orderId}</b></div><div><span>tool result</span><b>{trace.result}</b></div><div><span>refund executed</span><b>NO</b></div><div><span>provenance</span><b>{selected.provenance}</b></div></div> : <div className="technical-grid"><div><span>scenarioId</span><b>{selected.id}</b></div><div><span>engine verdict</span><b>{selected.engineVerdict}</b></div><div><span>human outcome</span><b>{selected.status.toUpperCase()}</b></div><div><span>trace detail</span><b>NOT INCLUDED IN SNAPSHOT</b></div><div><span>provenance</span><b>{selected.provenance}</b></div></div>}</div></section></div><button className="incident-link" onClick={() => onNavigate("incident")}><span className="incident-link-dot" />VIEW EVALUATOR FIXTURE REPLAY <ArrowRight size={14} /></button>
  </main>;
}

function IncidentScreen({ mode }: { mode: "simple" | "technical" }) {
  const [replayPhase, setReplayPhase] = useState<"idle" | "action-one" | "boundary" | "action-two" | "breach">("idle");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const replayTimers = useRef<number[]>([]);
  const [firstAction, secondAction] = evaluatorFixture.actions;
  const breachVisible = replayPhase === "breach";
  const replaying = replayPhase !== "idle" && !breachVisible;

  useEffect(() => () => replayTimers.current.forEach(window.clearTimeout), []);

  const replay = () => {
    replayTimers.current.forEach(window.clearTimeout);
    replayTimers.current = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReplayPhase("breach");
      return;
    }
    setReplayPhase("idle");
    const sequence: Array<[number, typeof replayPhase]> = [
      [160, "action-one"],
      [850, "boundary"],
      [1550, "action-two"],
      [2250, "breach"],
    ];
    replayTimers.current = sequence.map(([delay, phase]) => window.setTimeout(() => setReplayPhase(phase), delay));
  };

  const rawEvidence = JSON.stringify({
    provenance: evaluatorFixture.provenance,
    ruleId: evaluatorFixture.rule,
    orderId: evaluatorFixture.orderId,
    authorizedLimit: evaluatorFixture.authorized,
    actions: evaluatorFixture.actions,
    approval: evaluatorFixture.approval.toLowerCase(),
    trigger: evaluatorFixture.trigger.toLowerCase().replaceAll(" ", "_"),
  }, null, 2);

  return <main className="workspace-screen incident-screen">
    <div className="fixture-banner"><div className="fixture-banner-main"><span className="fixture-icon"><TriangleAlert size={15} /></span><div><strong>EVALUATOR FIXTURE</strong><span>Deterministic unit-test data / not a production run</span></div></div><div className="fixture-warning">NOT AN OBSERVED NOVA FAILURE</div></div>
    <div className="incident-heading"><div><SectionKicker icon={ScanLine}>INCIDENT REPLAY / RULE {evaluatorFixture.rule}</SectionKicker><h1>{evaluatorFixture.category}<br /><span>DETECTED</span></h1><p>Two successful fixture refunds cross the cumulative authority boundary.</p></div><div className="incident-actions"><button className={`replay-button ${replaying ? "is-playing" : ""}`} onClick={replay}>{replaying ? <><span className="replay-live" />REPLAYING FIXTURE</> : <><Play size={13} fill="currentColor" />REPLAY FIXTURE</>}</button><button className="icon-button" onClick={() => setDrawerOpen(true)} aria-label="View raw fixture evidence"><FileCode2 size={15} /></button></div></div>
    <div className={`incident-layout replay-phase-${replayPhase}`}><section className="incident-trajectory"><div className="incident-track-meta"><span>FIXTURE TRAJECTORY / CUMULATIVE CONSEQUENCE</span><span className={`freeze-label ${breachVisible ? "is-active" : ""}`}><span />{breachVisible ? "FROZEN AT BOUNDARY CROSSING" : "FREEZE AT BOUNDARY"}</span></div><div className="incident-track"><div className="incident-line"><span className="line-progress" /></div><div className="incident-start incident-node"><span className="impact-dot" /> <strong>{formatCurrency(0)}</strong><small>INITIAL STATE</small></div><div className="incident-action action-one"><span className="impact-dot" /><div><small>ACTION 01 / SUCCESSFUL {firstAction.tool}</small><strong>{formatCurrency(firstAction.amount)}</strong><span>CUMULATIVE <b>{formatCurrency(firstAction.cumulative)}</b></span></div></div><div className="incident-boundary"><span className="boundary-line" /><div><strong>{formatCurrency(evaluatorFixture.authorized)} AUTHORITY BOUNDARY</strong><small>PAUSE / BOUNDARY VISIBLE</small></div></div><div className="incident-action action-two"><span className="impact-dot" /><div><small>ACTION 02 / SUCCESSFUL {secondAction.tool}</small><strong>{formatCurrency(secondAction.amount)}</strong><span>CUMULATIVE MOVES TOWARD <b>{formatCurrency(secondAction.cumulative)}</b></span></div></div><div className="incident-impact"><span className="impact-flash" /><div className="breach-stamp"><TriangleAlert size={18} /><strong>BREACH</strong></div><div className="impact-values"><span><b>{formatCurrency(evaluatorFixture.observedCumulative)}</b>MOVED</span><span><b>{formatCurrency(evaluatorFixture.authorized)}</b>AUTHORIZED</span><span><b>NO</b>GRANTED APPROVAL</span></div></div></div><div className="incident-caption"><span className="fixture-marker" />{mode === "simple" ? "In this evaluator fixture, the second successful refund crosses the cumulative authority boundary." : <>{evaluatorFixture.rule} triggered when cumulative successful refund amount exceeded authority without approval.</>}</div></section><aside className={`evidence-rail glass-panel ${breachVisible ? "is-revealed" : ""}`} aria-hidden={!breachVisible}><div className="rail-heading"><span><Layers3 size={14} /> EVIDENCE RAIL</span><ProvenanceBadge type={evaluatorFixture.provenance} small /></div>{[["SEVERITY", evaluatorFixture.severity], ["RULE", evaluatorFixture.rule], ["CATEGORY", evaluatorFixture.category], ["ORDER", evaluatorFixture.orderId], ["AUTHORIZED", formatCurrency(evaluatorFixture.authorized)], ["OBSERVED", formatCurrency(evaluatorFixture.observedCumulative)], ["APPROVAL", evaluatorFixture.approval], ["TRIGGER", evaluatorFixture.trigger]].map(([label, value]) => <div className={`evidence-row ${label === "OBSERVED" ? "evidence-emphasis" : ""}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}<div className="evidence-rail-footer"><span>PROVENANCE</span><b>EVALUATOR FIXTURE</b><button onClick={() => setDrawerOpen(true)} tabIndex={breachVisible ? 0 : -1}>VIEW RAW EVIDENCE <ArrowUpRight size={13} /></button></div></aside></div>
    {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}><aside className="evidence-drawer" onClick={event => event.stopPropagation()}><div className="drawer-head"><div><span className="micro-label">RAW EVIDENCE / FIXTURE DATA</span><h2>{evaluatorFixture.rule} / {evaluatorFixture.orderId}</h2></div><button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Close raw evidence"><X size={16} /></button></div><ProvenanceBadge type={evaluatorFixture.provenance} /><pre>{rawEvidence}</pre><div className="drawer-note"><Info size={14} />This is deterministic evaluator fixture data. It is not an observed Nova failure.</div></aside></div>}
  </main>;
}

function CompareScreen({ onNavigate }: { onNavigate: (screen: ScreenKey) => void }) {
  const { summary, proofId } = observedRun;
  return <main className="workspace-screen compare-screen"><div className="compare-heading"><SectionKicker icon={GitBranch}>REGRESSION PASSPORT / COMPARISON</SectionKicker><h1>BEHAVIOR COMPARE</h1><p>Changing the model, rules, tools or runtime shouldn&apos;t silently change what your agent is allowed to do.</p><div className="compare-concept" aria-label="Comparison process"><span>BASELINE</span><ArrowRight size={14} /><span>CHANGE / MOVE AGENT</span><ArrowRight size={14} /><span>REPLAY SAME TESTS</span></div></div><div className="compare-layout"><section className="passport-card baseline-card"><div className="passport-top"><span className="micro-label">CURRENT BASELINE</span><span className="passport-check"><Check size={13} /> VERIFIED</span></div><div className="passport-agent"><div className="passport-avatar">N</div><div><h2>{agent.name.toUpperCase()}</h2><span>{proofId}</span></div></div><div className="passport-status"><div><b>{summary.held}</b><span>HELD</span></div><div><b>{summary.breach}</b><span>BREACH</span></div><div><b>{summary.error}</b><span>ERROR</span></div></div><div className="passport-meta"><div><span>RUNTIME</span><strong>{agent.runtime}</strong></div><div><span>MODEL</span><strong>{agent.model}</strong></div></div><ProvenanceBadge type={observedRun.provenance} /></section><div className="compare-bridge"><span className="bridge-line" /><span className="bridge-icon"><ArrowRight size={16} /></span><span className="bridge-line" /><small>SECOND RUN<br />REQUIRED TO DIFF</small></div><section className="passport-card candidate-card"><div className="passport-top"><span className="micro-label">SECOND RUN</span><span className="waiting-chip"><Clock3 size={12} /> WAITING</span></div><div className="empty-passport"><div className="empty-icon"><GitBranch size={20} /></div><h2>NO SECOND RUN SELECTED</h2><p>No candidate runtime or migration result exists. Select a future verified run before comparing behavior.</p><button className="outline-action" onClick={() => onNavigate("lab")}>VIEW CURRENT BASELINE <ArrowRight size={14} /></button></div><div className="candidate-placeholder"><span /><span /><span /></div></section></div><div className="compare-footer"><div><span>THE PASSPORT CAN TRAVEL.</span><strong>DID THE BEHAVIOR?</strong></div><div className="awaiting"><span className="awaiting-pulse" />{comparison.state}</div></div></main>;
}

function App() {
  const [location, setLocation] = useRoute();
  const screen = routeToKey(location);
  const [mode, setMode] = useState<"simple" | "technical">(() => localStorage.getItem("vectra-mode") === "technical" ? "technical" : "simple");

  useEffect(() => { localStorage.setItem("vectra-mode", mode); }, [mode]);
  useEffect(() => {
    const pageName = screen === "xray" ? "Agent X-Ray" : screen === "lab" ? "Crash Lab" : screen === "incident" ? "Incident Replay" : screen === "compare" ? "Behavior Compare" : "Behavioral Crash Testing";
    document.title = screen === "home" ? "VECTRA — Behavioral Crash Testing" : `${pageName} — VECTRA`;
  }, [screen]);

  const onNavigate = (next: ScreenKey) => setLocation(keyToPath[next]);
  const content = screen === "home" ? <HomeScreen onNavigate={onNavigate} />
    : screen === "xray" ? <XRayScreen onNavigate={onNavigate} />
    : screen === "lab" ? <CrashLabScreen onNavigate={onNavigate} mode={mode} />
    : screen === "incident" ? <IncidentScreen mode={mode} />
    : <CompareScreen onNavigate={onNavigate} />;

  return <PageFrame screen={screen} mode={mode} onModeChange={setMode} onNavigate={onNavigate}>{content}</PageFrame>;
}

export default App;
