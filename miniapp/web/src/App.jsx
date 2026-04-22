import { useEffect, useMemo, useState } from "react";
import { Activity, BrainCircuit, Gauge, Logs, Workflow } from "lucide-react";
import { api } from "./api/client";
import { getTelegramUserLabel, initTelegram } from "./lib/telegram";
import { clientLogger } from "./lib/logger";

const bottomNavItems = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "ai", label: "Ai", icon: BrainCircuit },
  { id: "agent", label: "Agent", icon: Workflow },
  { id: "logs", label: "Logs", icon: Logs }
];

const skillsData = [
  { id: "log_analyzer", status: "enabled", health: "ok", updated: "4 min ago" },
  { id: "web_search", status: "disabled", health: "api_key required", updated: "1h ago" },
  { id: "doc_summarizer", status: "enabled", health: "ok", updated: "today" },
  { id: "telegram_bridge", status: "enabled", health: "ok", updated: "yesterday" }
];

const cronJobs = [
  { id: "daily_summary", schedule: "0 9 * * *", last: "success", next: "08:59" },
  { id: "log_monitor", schedule: "*/10 * * * *", last: "failed", next: "00:08" },
  { id: "weekly_audit", schedule: "0 8 * * 1", last: "success", next: "Mon 08:00" }
];

const securityAlerts = [
  { id: "sec_01", level: "HIGH", text: "shell exec requested outside allowlist" },
  { id: "sec_02", level: "MEDIUM", text: "new browser requested device pairing" },
  { id: "sec_03", level: "MEDIUM", text: "cron log_monitor failed 3 times" }
];

const StatusPill = ({ value }) => (
  <span className={`pill pill-${String(value).toLowerCase()}`}>{value}</span>
);

const Panel = ({ title, right, children }) => (
  <section className="panel">
    <div className="panel-head">
      <h3>{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const modelColors = ["#22d3a3", "#60a5fa", "#f59e0b", "#f87171"];
const typeColors = {
  inputTokens: "#22d3a3",
  outputTokens: "#60a5fa",
  reasoningTokens: "#f59e0b",
  cacheTokens: "#a78bfa"
};

const metricOptions = [
  { id: "tokens", label: "Tokens" },
  { id: "cost", label: "Cost" },
  { id: "requests", label: "Requests" },
  { id: "io", label: "Input/Output" }
];

const compactNumber = (value) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`;
  return String(value || 0);
};

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const metricValue = (item, metric) => {
  if (metric === "cost") return item.costUsd || 0;
  if (metric === "requests") return item.requests || 0;
  return item.tokens || (item.inputTokens || 0) + (item.outputTokens || 0);
};

const metricLabel = (value, metric) => {
  if (metric === "cost") return money(value);
  if (metric === "requests") return compactNumber(value);
  return compactNumber(value);
};

const SegmentControl = ({ items, value, onChange }) => (
  <div className="segment-control">
    {items.map((item) => (
      <button
        key={item.id || item}
        className={(item.id || item) === value ? "active" : ""}
        onClick={() => onChange(item.id || item)}
      >
        {item.label || item}
      </button>
    ))}
  </div>
);

const DonutChart = ({ items, center, format = compactNumber }) => {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let used = 0;

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 120 120" role="img">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#20232c" strokeWidth="14" />
        {items.map((item) => {
          const length = (item.value / total) * circumference;
          const offset = -used;
          used += length;
          return (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
            />
          );
        })}
        <text x="60" y="57" textAnchor="middle" className="donut-center">{center}</text>
        <text x="60" y="74" textAnchor="middle" className="donut-caption">{format(total)}</text>
      </svg>
      <div className="legend">
        {items.map((item) => (
          <div key={item.label}>
            <span style={{ background: item.color }} />
            <strong>{item.label}</strong>
            <em>{format(item.value)}</em>
          </div>
        ))}
      </div>
    </div>
  );
};

const LineChart = ({ points, metric }) => {
  const values = points.map((point) =>
    metric === "cost"
      ? point.costUsd
      : metric === "requests"
        ? point.requests
        : (point.inputTokens || 0) + (point.outputTokens || 0)
  );
  const max = Math.max(...values, 1);
  const coords = values.map((value, index) => {
    const x = 14 + (index * 272) / Math.max(values.length - 1, 1);
    const y = 108 - (value / max) * 84;
    return `${x},${y}`;
  });

  return (
    <div className="line-chart">
      <svg viewBox="0 0 300 126" preserveAspectRatio="none">
        <path d="M14 108 H286" stroke="#272a34" />
        <path d="M14 66 H286" stroke="#20232b" />
        <path d="M14 24 H286" stroke="#20232b" />
        <polyline points={coords.join(" ")} fill="none" stroke="#22d3a3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => {
          const [cx, cy] = point.split(",");
          return <circle key={points[index].label} cx={cx} cy={cy} r="3" fill="#22d3a3" />;
        })}
      </svg>
      <div className="chart-labels">
        {points.map((point) => <span key={point.label}>{point.label}</span>)}
      </div>
    </div>
  );
};

const StackedBars = ({ points }) => {
  const max = Math.max(...points.map((point) => (point.inputTokens || 0) + (point.outputTokens || 0)), 1);
  return (
    <div className="bar-chart">
      {points.map((point) => {
        const total = (point.inputTokens || 0) + (point.outputTokens || 0);
        const inputHeight = Math.max(4, ((point.inputTokens || 0) / max) * 92);
        const outputHeight = Math.max(4, ((point.outputTokens || 0) / max) * 92);
        return (
          <div key={point.label} className="bar-col" title={`${point.label}: ${compactNumber(total)}`}>
            <div className="bar-stack">
              <i style={{ height: `${outputHeight}px`, background: typeColors.outputTokens }} />
              <i style={{ height: `${inputHeight}px`, background: typeColors.inputTokens }} />
            </div>
            <span>{point.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [agentPanel, setAgentPanel] = useState("main");
  const [bootstrap, setBootstrap] = useState(null);
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [ai, setAi] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsCursor, setLogsCursor] = useState("0");
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [tokenRange, setTokenRange] = useState("24h");
  const [tokenMetric, setTokenMetric] = useState("tokens");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canApprove = bootstrap?.permissions?.canApprove === true;
  const userLabel = useMemo(() => getTelegramUserLabel(), []);
  const primaryModel = ai?.models?.find((m) => m.role === "primary");
  const activeTokenData = ai?.rangeMetrics?.[tokenRange] || ai?.rangeMetrics?.["24h"];
  const activeModels = activeTokenData?.byModel || ai?.models || [];
  const activeTotals = activeTokenData?.totals || ai?.totals || {};
  const roleBreakdown = useMemo(() => {
    const primary = activeModels
      .filter((model) => model.role === "primary")
      .reduce((sum, model) => sum + metricValue(model, tokenMetric), 0);
    const fallback = activeModels
      .filter((model) => model.role === "fallback")
      .reduce((sum, model) => sum + metricValue(model, tokenMetric), 0);
    return [
      { label: "primary", value: primary, color: "#22d3a3" },
      { label: "fallback", value: fallback, color: "#60a5fa" }
    ];
  }, [activeModels, tokenMetric]);
  const modelBreakdown = useMemo(
    () =>
      activeModels.map((model, index) => ({
        label: model.id,
        value: metricValue(model, tokenMetric),
        color: modelColors[index % modelColors.length]
      })),
    [activeModels, tokenMetric]
  );
  const typeBreakdown = useMemo(
    () => [
      { label: "input", value: activeTotals.inputTokens || 0, color: typeColors.inputTokens },
      { label: "output", value: activeTotals.outputTokens || 0, color: typeColors.outputTokens },
      { label: "reasoning", value: activeTotals.reasoningTokens || 0, color: typeColors.reasoningTokens },
      { label: "cache", value: activeTotals.cacheTokens || 0, color: typeColors.cacheTokens }
    ],
    [activeTotals]
  );

  useEffect(() => {
    initTelegram().catch((error) => {
      clientLogger.error("telegram.init.failed", { error: error.message });
    });
  }, []);

  useEffect(() => {
    const onWindowError = (event) => {
      clientLogger.error("window.error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      });
    };
    const onUnhandledRejection = (event) => {
      clientLogger.error("window.unhandledrejection", {
        reason: String(event.reason)
      });
    };
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  const loadTab = async (tab) => {
    setError("");
    setLoading(true);
    try {
      if (tab === "overview") {
        const [overviewData, sessionsData, approvalsData, aiData] = await Promise.all([
          api.overview(),
          api.sessions(),
          api.approvals(),
          api.ai()
        ]);
        setOverview(overviewData);
        setSessions(sessionsData.items || []);
        setApprovals(approvalsData.items || []);
        setAi(aiData);
      }
      if (tab === "ai") setAi(await api.ai());
      if (tab === "agent") setApprovals((await api.approvals()).items || []);
      if (tab === "logs") {
        const page = await api.logs("0");
        setLogs(page.items || []);
        setLogsCursor(page.nextCursor || "0");
        setHasMoreLogs(Boolean(page.hasMore));
      }
    } catch (err) {
      clientLogger.error("ui.loadTab.failed", { tab, error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const boot = await api.bootstrap();
        setBootstrap(boot);
        await loadTab("overview");
      } catch (err) {
        clientLogger.error("ui.bootstrap.failed", { error: err.message });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onTabClick = async (tab) => {
    setActiveTab(tab);
    if (tab !== "agent") {
      setAgentPanel("main");
    }
    await loadTab(tab);
  };

  const onApproveAction = async (id, action) => {
    try {
      if (action === "approve") await api.approve(id);
      else await api.reject(id);
      const updated = await api.approvals();
      setApprovals(updated.items || []);
    } catch (err) {
      clientLogger.error("ui.approval.failed", { id, action, error: err.message });
      setError(err.message);
    }
  };

  const loadMoreLogs = async () => {
    if (!hasMoreLogs) return;
    try {
      const page = await api.logs(logsCursor);
      setLogs((prev) => [...prev, ...(page.items || [])]);
      setLogsCursor(page.nextCursor || logsCursor);
      setHasMoreLogs(Boolean(page.hasMore));
    } catch (err) {
      clientLogger.error("ui.logs.failed", { cursor: logsCursor, error: err.message });
      setError(err.message);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">Openclaw Pocket Console</div>
          <h1>Telegram Mini App</h1>
        </div>
        <div className="meta">
          <div>{userLabel}</div>
          <StatusPill value={bootstrap?.role || "guest"} />
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="loading">Loading...</div> : null}

      <main className="content">
        {activeTab === "overview" && overview && (
          <div className="stack">
            <Panel
              title="System Status"
              right={
                <div className="subtle subtle-icon">
                  <Activity size={14} />
                  <span>healthy</span>
                </div>
              }
            >
              <div className="card-grid">
                <article className="card">
                  <h4>Status</h4>
                  <p>{overview.status}</p>
                </article>
                <article className="card">
                  <h4>Workload</h4>
                  <p>{overview.workload}</p>
                </article>
                <article className="card">
                  <h4>Health</h4>
                  <p>{overview.health}</p>
                </article>
                <article className="card">
                  <h4>Current bot</h4>
                  <p>{overview.currentBot}</p>
                </article>
              </div>
            </Panel>

            <Panel title="Operational Snapshot">
              <div className="kv-list">
                <div><span>last session</span><strong>{sessions[0]?.id || "-"}</strong></div>
                <div><span>last updated skill</span><strong>{skillsData[0]?.id}</strong></div>
                <div><span>latest cron run</span><strong>{overview.latestCron}</strong></div>
                <div><span>nearest cron job</span><strong>{overview.nearestCron}</strong></div>
                <div><span>primary model</span><strong>{primaryModel?.id || overview.primaryModel}</strong></div>
              </div>
            </Panel>

            <Panel title="Security & Warnings" right={<StatusPill value={String(securityAlerts.length)} />}>
              <div className="list">
                {securityAlerts.map((alert) => (
                  <article key={alert.id} className="list-item">
                    <div>{alert.text}</div>
                    <StatusPill value={alert.level} />
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "ai" && ai && (
          <div className="stack">
            <Panel title="Context Tokens" right={<StatusPill value={tokenRange} />}>
              <div className="dashboard-controls">
                <SegmentControl items={ai.ranges || ["1h", "24h", "7d", "30d", "all"]} value={tokenRange} onChange={setTokenRange} />
                <SegmentControl items={metricOptions} value={tokenMetric} onChange={setTokenMetric} />
              </div>
              <div className="model-strip">
                <article>
                  <span>Primary model</span>
                  <strong>{ai.primaryModel || primaryModel?.id}</strong>
                </article>
                <article>
                  <span>Fallback models</span>
                  <strong>{(ai.fallbackModels || []).join(", ")}</strong>
                </article>
              </div>
              <div className="card-grid">
                <article className="card">
                  <h4>Total tokens</h4>
                  <p>{compactNumber(activeTotals.totalTokens || 0)}</p>
                </article>
                <article className="card">
                  <h4>Cost</h4>
                  <p>{money(activeTotals.costUsd || 0)}</p>
                </article>
                <article className="card">
                  <h4>Requests</h4>
                  <p>{compactNumber(activeTotals.requests || 0)}</p>
                </article>
                <article className="card">
                  <h4>Output</h4>
                  <p>{compactNumber(activeTotals.outputTokens || 0)}</p>
                </article>
              </div>
            </Panel>

            <div className="chart-grid">
              <Panel title="By Model">
                <DonutChart items={modelBreakdown} center={tokenMetric === "cost" ? "cost" : tokenMetric} format={(value) => metricLabel(value, tokenMetric)} />
              </Panel>
              <Panel title="Primary / Fallback">
                <DonutChart items={roleBreakdown} center="roles" format={(value) => metricLabel(value, tokenMetric)} />
              </Panel>
            </div>

            <Panel title="Token Type">
              <DonutChart items={typeBreakdown} center="types" />
            </Panel>

            <Panel title="Trend">
              {tokenMetric === "io" ? (
                <StackedBars points={activeTokenData?.timeseries || []} />
              ) : (
                <LineChart points={activeTokenData?.timeseries || []} metric={tokenMetric} />
              )}
            </Panel>

            <Panel title="Models Analytics">
              <div className="list">
                {activeModels.map((m, index) => {
                  const modelValue = metricValue(m, tokenMetric);
                  const totalValue = activeModels.reduce((sum, model) => sum + metricValue(model, tokenMetric), 0) || 1;
                  return (
                    <article key={m.id} className="analytics-card">
                      <div className="analytics-head">
                        <div>
                          <strong>{m.id}</strong>
                          <small>{m.requests} requests / {m.latency}</small>
                        </div>
                        <StatusPill value={m.role} />
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${Math.round((modelValue / totalValue) * 100)}%`,
                            background: modelColors[index % modelColors.length]
                          }}
                        />
                      </div>
                      <div className="analytics-foot">
                        <span>{metricLabel(modelValue, tokenMetric)}</span>
                        <span>{money(m.costUsd || 0)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "agent" && (
          <div className="stack">
            {agentPanel === "main" && (
              <>
                <Panel title="Agent Control">
                  <div className="kv-list">
                    <div><span>agent name</span><strong>warframe-operator</strong></div>
                    <div><span>policy mode</span><strong>balanced</strong></div>
                    <div><span>reasoning</span><strong>adaptive</strong></div>
                    <div><span>exec approvals</span><StatusPill value="MEDIUM" /></div>
                    <div><span>default model</span><strong>{primaryModel?.id || "-"}</strong></div>
                  </div>
                </Panel>
                <Panel title="Agent Menus">
                  <div className="menu-grid">
                    <button onClick={() => setAgentPanel("skills")}>Skills ({skillsData.length})</button>
                    <button onClick={() => setAgentPanel("cron")}>Cron Jobs ({cronJobs.length})</button>
                  </div>
                </Panel>
                <Panel title="Pending Approvals" right={<StatusPill value={String(approvals.length)} />}>
                  <div className="list">
                    {approvals.map((a) => (
                      <article key={a.id} className="list-item approval-item">
                        <div>
                          <strong>{a.id}</strong>
                          <div>{a.title}</div>
                          <small>{a.meta}</small>
                        </div>
                        <div className="approval-actions">
                          <StatusPill value={a.risk} />
                          <StatusPill value={a.state} />
                          <button disabled={!canApprove || a.state !== "pending"} onClick={() => onApproveAction(a.id, "approve")}>Approve</button>
                          <button disabled={!canApprove || a.state !== "pending"} onClick={() => onApproveAction(a.id, "reject")}>Reject</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </Panel>
              </>
            )}

            {agentPanel === "skills" && (
              <Panel title="Skills" right={<button onClick={() => setAgentPanel("main")}>Back</button>}>
                <div className="list">
                  {skillsData.map((s) => (
                    <article key={s.id} className="list-item">
                      <div>
                        <strong>{s.id}</strong>
                        <small>health: {s.health} | updated: {s.updated}</small>
                      </div>
                      <StatusPill value={s.status} />
                    </article>
                  ))}
                </div>
              </Panel>
            )}

            {agentPanel === "cron" && (
              <Panel title="Cron Jobs" right={<button onClick={() => setAgentPanel("main")}>Back</button>}>
                <div className="list">
                  {cronJobs.map((job) => (
                    <article key={job.id} className="list-item">
                      <div>
                        <strong>{job.id}</strong>
                        <small>{job.schedule}</small>
                      </div>
                      <div className="right-col">
                        <StatusPill value={job.last} />
                        <small>{job.next}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="stack">
            <Panel title="Logs Feed" right={<StatusPill value="live" />}>
              <div className="list">
                {logs.map((line, idx) => (
                  <article key={`${line}-${idx}`} className="list-item mono">{line}</article>
                ))}
                <button className="full" disabled={!hasMoreLogs} onClick={loadMoreLogs}>
                  {hasMoreLogs ? "Load more" : "No more logs"}
                </button>
              </div>
            </Panel>
            <Panel title="Security Warnings">
              <div className="list">
                {securityAlerts.map((alert) => (
                  <article key={alert.id} className="list-item">
                    <div>{alert.text}</div>
                    <StatusPill value={alert.level} />
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </main>

      <footer className="bottom-nav">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-btn ${activeTab === item.id ? "active" : ""}`}
            onClick={() => onTabClick(item.id)}
          >
            <span className="bottom-nav-icon"><item.icon size={16} strokeWidth={2.2} /></span>
            <span>{item.label}</span>
          </button>
        ))}
      </footer>
    </div>
  );
}

