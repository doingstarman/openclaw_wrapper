import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  BrainCircuit,
  CalendarClock,
  Cpu,
  FileText,
  Gauge,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Wrench,
  Workflow
} from "lucide-react";
import { api } from "./api/client";
import { getTelegramUserLabel, initTelegram } from "./lib/telegram";
import { clientLogger } from "./lib/logger";

const bottomNavItems = [
  { id: "overview", label: "Главная", icon: Gauge },
  { id: "ai", label: "ИИ", icon: BrainCircuit },
  { id: "agent", label: "Агент", icon: Workflow },
  { id: "settings", label: "Настройки", icon: Settings }
];


const statusLabels = {
  "1h": "1 ч",
  "24h": "24 ч",
  "7d": "7 д",
  "30d": "30 д",
  active: "активен",
  admin: "админ",
  all: "все",
  approved: "одобрено",
  disabled: "выключен",
  enabled: "включен",
  failed: "ошибка",
  fallback: "резервная",
  guest: "гость",
  HIGH: "высокий",
  idle: "ожидает",
  inactive: "выключен",
  live: "живо",
  calendar: "календарь",
  MEDIUM: "средний",
  missing_key: "нет ключа",
  needs_config: "нужна настройка",
  not_configured: "не настроен",
  ok: "в норме",
  online: "онлайн",
  paused: "пауза",
  pending: "ожидает",
  primary: "основная",
  rejected: "отклонено",
  running: "в работе",
  stable: "стабильно",
  success: "успех",
  viewer: "просмотр"
};

const displayStatus = (value) => statusLabels[String(value)] || value;

const StatusPill = ({ value }) => (
  <span className={`pill pill-${String(value).toLowerCase()}`}>{displayStatus(value)}</span>
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
  { id: "tokens", label: "Токены" },
  { id: "cost", label: "Стоимость" },
  { id: "requests", label: "Запросы" },
  { id: "io", label: "Ввод/вывод" }
];

const rangeOptions = (ranges = ["1h", "24h", "7d", "30d", "all"]) =>
  ranges.map((id) => ({ id, label: displayStatus(id) }));

const skillFilters = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "inactive", label: "Выключены" },
  { id: "needs_attention", label: "С ошибками" },
  { id: "recent", label: "Недавние" }
];

const compactNumber = (value) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`;
  return String(value || 0);
};

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "никогда";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatDate = (value) => {
  if (!value) return "неизвестно";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
};

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
  const [bootstrap, setBootstrap] = useState(null);
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [ai, setAi] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [skills, setSkills] = useState([]);
  const [subagents, setSubagents] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [agentView, setAgentView] = useState("main");
  const [skillQuery, setSkillQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");
  const [logs, setLogs] = useState([]);
  const [logsCursor, setLogsCursor] = useState("0");
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [tokenRange, setTokenRange] = useState("24h");
  const [tokenMetric, setTokenMetric] = useState("tokens");
  const [error, setError] = useState("");
  const [authMissing, setAuthMissing] = useState(false);
  const [loading, setLoading] = useState(false);

  const canApprove = bootstrap?.permissions?.canApprove === true;
  const userLabel = useMemo(() => getTelegramUserLabel(), []);
  const primaryModel = ai?.models?.find((m) => m.role === "primary");
  const skillsData = overview?.skills || [];
  const cronJobs = overview?.cronJobs || [];
  const securityAlerts = overview?.securityAlerts || [];
  const activeTokenData = ai?.rangeMetrics?.[tokenRange] || ai?.rangeMetrics?.["24h"];
  const activeModels = activeTokenData?.byModel || ai?.models || [];
  const activeTotals = activeTokenData?.totals || ai?.totals || {};
  const metricName = metricOptions.find((item) => item.id === tokenMetric)?.label || "Токены";
  const pendingApprovals = approvals.filter((item) => item.state === "pending");
  const activeSkillsCount = skills.filter((skill) => skill.status === "active").length;
  const attentionSkillsCount = skills.filter((skill) => ["failed", "needs_config", "missing_key"].includes(skill.health)).length;
  const runningSubagentsCount = subagents.filter((item) => item.status === "running").length;
  const currentEvent = useMemo(() => {
    if (overview?.currentEvent) {
      return {
        label: "Сейчас в календаре",
        title: overview.currentEvent.title,
        detail: overview.currentEvent.detail,
        state: overview.currentEvent.state || overview.currentEvent.source || "calendar"
      };
    }

    const runningSession = sessions.find((session) => session.status === "running");
    if (runningSession) {
      return {
        label: "Активная работа",
        title: runningSession.id,
        detail: `${runningSession.last} · ${runningSession.tokens} токенов`,
        state: runningSession.status
      };
    }

    return {
      label: "Состояние OpenClaw",
      title: "Система работает штатно",
      detail: `${overview?.workload || "нет активной нагрузки"} · ${overview?.currentBot || "бот не выбран"}`,
      state: overview?.health || "stable"
    };
  }, [approvals, overview, sessions]);
  const roleBreakdown = useMemo(() => {
    const primary = activeModels
      .filter((model) => model.role === "primary")
      .reduce((sum, model) => sum + metricValue(model, tokenMetric), 0);
    const fallback = activeModels
      .filter((model) => model.role === "fallback")
      .reduce((sum, model) => sum + metricValue(model, tokenMetric), 0);
    return [
      { label: "основная", value: primary, color: "#22d3a3" },
      { label: "резервные", value: fallback, color: "#60a5fa" }
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
      { label: "ввод", value: activeTotals.inputTokens || 0, color: typeColors.inputTokens },
      { label: "вывод", value: activeTotals.outputTokens || 0, color: typeColors.outputTokens },
      { label: "рассуждение", value: activeTotals.reasoningTokens || 0, color: typeColors.reasoningTokens },
      { label: "кэш", value: activeTotals.cacheTokens || 0, color: typeColors.cacheTokens }
    ],
    [activeTotals]
  );
  const filteredSkills = useMemo(() => {
    const query = skillQuery.trim().toLowerCase();
    return skills.filter((skill) => {
      const text = `${skill.id} ${skill.name} ${skill.description}`.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesFilter =
        skillFilter === "all" ||
        (skillFilter === "active" && skill.status === "active") ||
        (skillFilter === "inactive" && skill.status === "inactive") ||
        (skillFilter === "needs_attention" && ["failed", "needs_config", "missing_key"].includes(skill.health)) ||
        (skillFilter === "recent" && skill.lastRunAt);
      return matchesQuery && matchesFilter;
    });
  }, [skillFilter, skillQuery, skills]);

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
    setAuthMissing(false);
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
      if (tab === "agent") {
        const [approvalsData, skillsData, subagentsData] = await Promise.all([
          api.approvals(),
          api.skills(),
          api.subagents()
        ]);
        setApprovals(approvalsData.items || []);
        setSkills(skillsData.items || []);
        setSubagents(subagentsData.items || []);
      }
      if (tab === "logs") {
        const logsData = await api.logs("0");
        setLogs(logsData.items || []);
        setLogsCursor(logsData.nextCursor || "0");
        setHasMoreLogs(Boolean(logsData.hasMore));
      }
      if (tab === "settings") {
        if (!ai) setAi(await api.ai());
      }
    } catch (err) {
      clientLogger.error("ui.loadTab.failed", { tab, error: err.message });
      setAuthMissing(err.message === "Missing Telegram initData");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await initTelegram();
        const boot = await api.bootstrap();
        setBootstrap(boot);
        await loadTab("overview");
      } catch (err) {
        clientLogger.error("ui.bootstrap.failed", { error: err.message });
        setAuthMissing(err.message === "Missing Telegram initData");
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onTabClick = async (tab) => {
    setActiveTab(tab);
    if (tab !== "agent") setAgentView("main");
    await loadTab(tab);
  };

  const openSkills = async () => {
    setActiveTab("agent");
    setAgentView("skills");
    const skillsData = await api.skills();
    setSkills(skillsData.items || []);
  };

  const openSubagents = async () => {
    setActiveTab("agent");
    setAgentView("subagents");
    const data = await api.subagents();
    setSubagents(data.items || []);
  };

  const openSkillDetail = async (skillId) => {
    const detail = await api.skill(skillId);
    setSelectedSkill(detail.item);
    setAgentView("skillDetail");
  };

  const runSkillAction = async (skillId, action) => {
    try {
      const result = await api.skillAction(skillId, action);
      const updated = result.item;
      setSelectedSkill(updated);
      setSkills((prev) => prev.map((skill) => (skill.id === skillId ? { ...skill, ...updated } : skill)));
    } catch (err) {
      clientLogger.error("ui.skillAction.failed", { skillId, action, error: err.message });
      setError(err.message);
    }
  };

  const runSubagentAction = async (subagentId, action) => {
    const message = action === "steer" ? window.prompt("Что передать субагенту?") : "";
    if (action === "steer" && !message?.trim()) return;
    if (action === "kill" && !window.confirm("Остановить этого субагента?")) return;
    try {
      const result = await api.subagentAction(subagentId, action, message || "");
      const updated = result.item;
      setSubagents((prev) => prev.map((item) => (item.id === updated.id || item.childSessionKey === updated.childSessionKey ? { ...item, ...updated } : item)));
    } catch (err) {
      clientLogger.error("ui.subagentAction.failed", { subagentId, action, error: err.message });
      setError(err.message);
    }
  };

  const openLogs = async () => {
    setActiveTab("logs");
    await loadTab("logs");
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
      {authMissing ? (
        <div className="empty-state">
          <h2>Открой меня из Telegram</h2>
          <p>Этот пульт проверяет Telegram initData, поэтому прямой браузерный URL без подписи не пускает внутрь.</p>
          <small>Если это тест в браузере — нужен отдельный dev-режим, но для боевого доступа он выключен специально.</small>
        </div>
      ) : error ? <div className="error">{error}</div> : null}
      {loading ? <div className="loading">Загрузка...</div> : null}

      <main className="content">
        {activeTab === "overview" && overview && (
          <div className="stack">
            <section className="home-hero">
              <div className="home-hero-glow" />
              <div className="home-hero-top">
                <div className="hero-source">
                  <CalendarClock size={16} />
                  <span>{currentEvent.label}</span>
                </div>
                <StatusPill value={currentEvent.state} />
              </div>
              <div className="home-hero-main">
                <h2>{currentEvent.title}</h2>
                <p>{currentEvent.detail}</p>
              </div>
              <div className="home-hero-bottom">
                <div>
                  <span>Следующее действие</span>
                  <strong>{overview.operational?.nearestCron || overview.nearestCron}</strong>
                </div>
                <div>
                  <span>Инстанс</span>
                  <strong>{overview.instance}</strong>
                </div>
              </div>
            </section>

            <section className="home-status-grid">
              <article>
                <Server size={17} />
                <span>Gateway</span>
                <strong>{displayStatus(overview.health)}</strong>
              </article>
              <article>
                <Bot size={17} />
                <span>Telegram</span>
                <strong>{overview.currentBot}</strong>
              </article>
              <article>
                <Cpu size={17} />
                <span>Модель</span>
                <strong>{primaryModel?.id || overview.primaryModel}</strong>
              </article>
              <article>
                <ShieldCheck size={17} />
                <span>Риски</span>
                <strong>{securityAlerts.length}</strong>
              </article>
            </section>

            <section className="home-command-band">
              <div className="command-band-head">
                <div>
                  <span>Операционный срез</span>
                  <h3>Что сейчас делает OpenClaw</h3>
                </div>
                <div className="subtle subtle-icon">
                  <Activity size={14} />
                  <span>{overview.workload}</span>
                </div>
              </div>
              <div className="home-timeline">
                <article>
                  <span>последняя сессия</span>
                  <strong>{overview.operational?.lastSession || sessions[0]?.title || "-"}</strong>
                </article>
                <article>
                  <span>последний навык</span>
                  <strong>{overview.operational?.lastSkill || skillsData[0]?.id || "-"}</strong>
                </article>
                <article>
                  <span>последний cron</span>
                  <strong>{overview.operational?.latestCron || overview.latestCron}</strong>
                </article>
                <article>
                  <span>основная модель</span>
                  <strong>{overview.operational?.primaryModel || primaryModel?.id || overview.primaryModel}</strong>
                </article>
              </div>
            </section>

            <Panel title="Безопасность и предупреждения" right={<StatusPill value={String(securityAlerts.length)} />}>
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
            <Panel title="Токены контекста" right={<StatusPill value={tokenRange} />}>
              <div className="dashboard-controls">
                <SegmentControl items={rangeOptions(ai.ranges)} value={tokenRange} onChange={setTokenRange} />
                <SegmentControl items={metricOptions} value={tokenMetric} onChange={setTokenMetric} />
              </div>
              <div className="model-strip">
                <article>
                  <span>Основная модель</span>
                  <strong>{ai.primaryModel || primaryModel?.id}</strong>
                </article>
                <article>
                  <span>Резервные модели</span>
                  <strong>{(ai.fallbackModels || []).join(", ")}</strong>
                </article>
              </div>
              <div className="card-grid">
                <article className="card">
                  <h4>Всего токенов</h4>
                  <p>{compactNumber(activeTotals.totalTokens || 0)}</p>
                </article>
                <article className="card">
                  <h4>Стоимость</h4>
                  <p>{money(activeTotals.costUsd || 0)}</p>
                </article>
                <article className="card">
                  <h4>Запросы</h4>
                  <p>{compactNumber(activeTotals.requests || 0)}</p>
                </article>
                <article className="card">
                  <h4>Вывод</h4>
                  <p>{compactNumber(activeTotals.outputTokens || 0)}</p>
                </article>
              </div>
            </Panel>

            <div className="chart-grid">
              <Panel title="По моделям">
                <DonutChart items={modelBreakdown} center={metricName} format={(value) => metricLabel(value, tokenMetric)} />
              </Panel>
              <Panel title="Основная / резервные">
                <DonutChart items={roleBreakdown} center="роли" format={(value) => metricLabel(value, tokenMetric)} />
              </Panel>
            </div>

            <Panel title="Тип токенов">
              <DonutChart items={typeBreakdown} center="типы" />
            </Panel>

            <Panel title="Динамика">
              {tokenMetric === "io" ? (
                <StackedBars points={activeTokenData?.timeseries || []} />
              ) : (
                <LineChart points={activeTokenData?.timeseries || []} metric={tokenMetric} />
              )}
            </Panel>

            <Panel title="Аналитика моделей">
              <div className="list">
                {activeModels.map((m, index) => {
                  const modelValue = metricValue(m, tokenMetric);
                  const totalValue = activeModels.reduce((sum, model) => sum + metricValue(model, tokenMetric), 0) || 1;
                  return (
                    <article key={m.id} className="analytics-card">
                      <div className="analytics-head">
                        <div>
                          <strong>{m.id}</strong>
                          <small>{m.requests} запросов / задержка {(m.latency || "-").replace("s", "с")}</small>
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
            {agentView === "main" && (
              <>
                <section className="agent-hero">
                  <div className="agent-hero-top">
                    <div className="agent-orbit">
                      <Workflow size={21} />
                    </div>
                    <StatusPill value={pendingApprovals.length ? "pending" : "running"} />
                  </div>
                  <div className="agent-hero-main">
                    <span>Операционный центр агента</span>
                    <h2>{sessions.find((item) => item.status === "running")?.title || "агент ожидает задачу"}</h2>
                    <p>{pendingApprovals.length ? `${pendingApprovals.length} решений ждут подтверждения` : "Критичных согласований нет"}</p>
                  </div>
                  <div className="agent-hero-grid">
                    <div><span>модель</span><strong>{primaryModel?.id || overview?.primaryModel || "-"}</strong></div>
                    <div><span>роль</span><strong>{displayStatus(bootstrap?.role || "guest")}</strong></div>
                    <div><span>skills</span><strong>{activeSkillsCount}/{skills.length || skillsData.length || 0}</strong></div>
                    <div><span>субагент</span><strong>{subagents[0]?.status ? displayStatus(subagents[0].status) : "календарь"}</strong></div>
                  </div>
                </section>

                <section className="agent-action-grid">
                  <button onClick={openSkills}>
                    <Wrench size={18} />
                    <span>Навыки</span>
                    <strong>{attentionSkillsCount ? `${attentionSkillsCount} требуют внимания` : `${activeSkillsCount} активны`}</strong>
                  </button>
                  <button onClick={openSubagents}>
                    <Workflow size={18} />
                    <span>Календарь</span>
                    <strong>{subagents[0]?.nextEvent || "агент управления"}</strong>
                  </button>
                  <button>
                    <ShieldCheck size={18} />
                    <span>Согласования</span>
                    <strong>{pendingApprovals.length ? `${pendingApprovals.length} ожидают` : "очередь пуста"}</strong>
                  </button>
                  <button onClick={openLogs}>
                    <FileText size={18} />
                    <span>Логи</span>
                    <strong>живая лента</strong>
                  </button>
                </section>

                <Panel title="Согласования" right={<StatusPill value={String(approvals.length)} />}>
                  <div className="list">
                    {approvals.map((a) => (
                      <article key={a.id} className="approval-card">
                        <div className="approval-card-head">
                          <span>{a.id}</span>
                          <div>
                            <StatusPill value={a.risk} />
                            <StatusPill value={a.state} />
                          </div>
                        </div>
                        <div className="approval-card-body">
                          <div>{a.title}</div>
                          <small>{a.meta}</small>
                        </div>
                        <div className="approval-actions">
                          <button className="approve-button" disabled={!canApprove || a.state !== "pending"} onClick={() => onApproveAction(a.id, "approve")}>Одобрить</button>
                          <button className="reject-button" disabled={!canApprove || a.state !== "pending"} onClick={() => onApproveAction(a.id, "reject")}>Отклонить</button>
                        </div>
                      </article>
                    ))}
                    {!approvals.length ? <div className="empty-inline">Очередь согласований пуста</div> : null}
                  </div>
                </Panel>

                <Panel title="Предупреждения безопасности">
                  <div className="list">
                    {securityAlerts.map((alert) => (
                      <article key={alert.id} className="list-item">
                        <div>{alert.text}</div>
                        <StatusPill value={alert.level} />
                      </article>
                    ))}
                  </div>
                </Panel>
              </>
            )}

            {agentView === "subagents" && (
              <>
                <section className="skills-hero">
                  <div>
                    <span>Delegation</span>
                    <h2>Агент календаря</h2>
                    <p>Единственный субагент · управление расписанием, событиями и напоминаниями</p>
                  </div>
                  <button onClick={() => setAgentView("main")}>Назад</button>
                </section>

                <Panel title="Управление календарём" right={<button onClick={openSubagents}>Обновить</button>}>
                  <div className="list">
                    {subagents.map((item) => (
                      <article key={item.id || item.childSessionKey} className="skill-card">
                        <div className="skill-card-main skill-card-main-static">
                          <span>
                            <strong>{item.label || item.id}</strong>
                            <small>{item.task || "Задача не указана"}</small>
                          </span>
                          <div>
                            <StatusPill value={item.status || "unknown"} />
                            {item.outcome ? <StatusPill value={item.outcome} /> : null}
                          </div>
                        </div>
                        <div className="skill-meta-grid">
                          <div><span>ближайшее</span><strong>{item.nextEvent || "нет событий"}</strong></div>
                          <div><span>когда</span><strong>{item.nextEventAt || "-"}</strong></div>
                          <div><span>обновлен</span><strong>{formatDateTime(item.updatedAt)}</strong></div>
                          <div><span>модель</span><strong>{item.model || "default"}</strong></div>
                        </div>
                        <div className="kv-list compact">
                          <div><span>child</span><strong>{item.childSessionKey || "-"}</strong></div>
                          <div><span>requester</span><strong>{item.requesterSessionKey || "-"}</strong></div>
                        </div>
                        <p className="muted-copy">{item.summary || "Пока нет summary"}</p>
                        {item.lastAction ? <p className="muted-copy">Последнее действие: {item.lastAction}</p> : null}
                        <div className="skill-actions">
                          <button disabled={!canApprove || item.status !== "running"} onClick={() => runSubagentAction(item.id, "steer")}>Дать инструкцию</button>
                          <button disabled={!canApprove || item.status !== "running"} onClick={() => runSubagentAction(item.id, "kill")}>Поставить на паузу</button>
                        </div>
                      </article>
                    ))}
                    {!subagents.length ? <div className="empty-inline">Агент календаря пока не найден</div> : null}
                  </div>
                </Panel>
              </>
            )}

            {agentView === "skills" && (
              <>
                <section className="skills-hero">
                  <div>
                    <span>Toolbox</span>
                    <h2>Навыки агента</h2>
                    <p>{skills.length} установлено · {activeSkillsCount} активны · {attentionSkillsCount} требуют настройки</p>
                  </div>
                  <button onClick={() => setAgentView("main")}>Назад</button>
                </section>

                <Panel title="Поиск и фильтры">
                  <div className="skill-toolbar">
                    <label className="search-box">
                      <Search size={15} />
                      <input value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="Поиск по навыкам" />
                    </label>
                    <SegmentControl items={skillFilters} value={skillFilter} onChange={setSkillFilter} />
                  </div>
                </Panel>

                <div className="list">
                  {filteredSkills.map((skill) => (
                    <article key={skill.id} className="skill-card">
                      <button className="skill-card-main" onClick={() => openSkillDetail(skill.id)}>
                        <span>
                          <strong>{skill.name || skill.id}</strong>
                          <small>{skill.description || "Описание не задано"}</small>
                        </span>
                        <StatusPill value={skill.status} />
                      </button>
                      <div className="skill-meta-grid">
                        <div><span>последний запуск</span><strong>{formatDateTime(skill.lastRunAt)}</strong></div>
                        <div><span>установлен</span><strong>{formatDate(skill.installedAt)}</strong></div>
                        <div><span>источник</span><strong>{skill.source || "-"}</strong></div>
                        <div><span>здоровье</span><StatusPill value={skill.health || "unknown"} /></div>
                      </div>
                      <div className="skill-actions">
                        <button onClick={() => runSkillAction(skill.id, "check")}>Проверить</button>
                        <button onClick={() => openSkillDetail(skill.id)}>Подробнее</button>
                        <button onClick={() => runSkillAction(skill.id, skill.status === "active" ? "disable" : "enable")}>
                          {skill.status === "active" ? "Выключить" : "Включить"}
                        </button>
                      </div>
                    </article>
                  ))}
                  {!filteredSkills.length ? <div className="empty-inline">Навыки не найдены</div> : null}
                </div>
              </>
            )}

            {agentView === "skillDetail" && selectedSkill && (
              <>
                <Panel title={selectedSkill.name || selectedSkill.id} right={<button onClick={() => setAgentView("skills")}>Назад</button>}>
                  <div className="skill-detail-head">
                    <p>{selectedSkill.description || "Описание не задано"}</p>
                    <div>
                      <StatusPill value={selectedSkill.status} />
                      <StatusPill value={selectedSkill.health || "unknown"} />
                    </div>
                  </div>
                  <div className="kv-list">
                    <div><span>id</span><strong>{selectedSkill.id}</strong></div>
                    <div><span>версия</span><strong>{selectedSkill.version || "-"}</strong></div>
                    <div><span>источник</span><strong>{selectedSkill.source || "-"}</strong></div>
                    <div><span>установлен</span><strong>{formatDate(selectedSkill.installedAt)}</strong></div>
                    <div><span>последний запуск</span><strong>{formatDateTime(selectedSkill.lastRunAt)}</strong></div>
                    <div><span>результат</span><StatusPill value={selectedSkill.lastResult || "unknown"} /></div>
                    <div><span>запусков</span><strong>{selectedSkill.runs ?? 0}</strong></div>
                  </div>
                </Panel>

                <Panel title="Управление">
                  <div className="skill-actions skill-actions-wide">
                    <button onClick={() => runSkillAction(selectedSkill.id, "check")}>Запустить проверку</button>
                    <button onClick={() => runSkillAction(selectedSkill.id, selectedSkill.status === "active" ? "disable" : "enable")}>
                      {selectedSkill.status === "active" ? "Выключить" : "Включить"}
                    </button>
                  </div>
                </Panel>

                <Panel title="Триггеры и зависимости">
                  <div className="tag-list">
                    {(selectedSkill.triggers || []).map((item) => <span key={`trigger-${item}`}>{item}</span>)}
                    {(selectedSkill.dependencies || []).map((item) => <span key={`dep-${item}`}>{item}</span>)}
                    {!selectedSkill.triggers?.length && !selectedSkill.dependencies?.length ? <small>Нет данных</small> : null}
                  </div>
                </Panel>

                <Panel title="Последние логи">
                  <div className="list">
                    {(selectedSkill.logs || []).map((line, index) => (
                      <article key={`${selectedSkill.id}-log-${index}`} className="list-item mono">{line}</article>
                    ))}
                    {!selectedSkill.logs?.length ? <div className="empty-inline">Логов пока нет</div> : null}
                  </div>
                </Panel>
              </>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="stack">
            <section className="settings-hero">
              <div>
                <span>Configuration</span>
                <h2>Настройки</h2>
                <p>Системные параметры mini app, Telegram-доступа и локального OpenClaw.</p>
              </div>
              <StatusPill value={overview?.status || "unknown"} />
            </section>

            <section className="settings-grid">
              <article className="settings-tile">
                <Server size={18} />
                <span>Инстанс</span>
                <strong>{overview?.instance || "-"}</strong>
              </article>
              <article className="settings-tile">
                <Bot size={18} />
                <span>Telegram</span>
                <strong>{overview?.currentBot || "-"}</strong>
              </article>
              <article className="settings-tile">
                <BrainCircuit size={18} />
                <span>Модель</span>
                <strong>{overview?.operational?.primaryModel || primaryModel?.id || overview?.primaryModel || "-"}</strong>
              </article>
              <article className="settings-tile">
                <ShieldCheck size={18} />
                <span>Доступ</span>
                <strong>{displayStatus(bootstrap?.role || "guest")}</strong>
              </article>
            </section>

            <section className="settings-section">
              <div className="settings-section-head">
                <div>
                  <span>OpenClaw</span>
                  <h3>Runtime и gateway</h3>
                </div>
                <StatusPill value={overview?.health || "unknown"} />
              </div>
              <div className="settings-list">
                <div><span>нагрузка</span><strong>{overview?.workload || "-"}</strong></div>
                <div><span>paired devices</span><strong>{overview?.operational?.pairedDevices ?? "-"}</strong></div>
                <div><span>ближайший cron</span><strong>{overview?.operational?.nearestCron || overview?.nearestCron || "-"}</strong></div>
                <div><span>последний cron</span><strong>{overview?.operational?.latestCron || overview?.latestCron || "-"}</strong></div>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-head">
                <div>
                  <span>Security</span>
                  <h3>Telegram и права</h3>
                </div>
                <StatusPill value={canApprove ? "admin" : "viewer"} />
              </div>
              <div className="settings-list">
                <div><span>пользователь</span><strong>{userLabel}</strong></div>
                <div><span>роль</span><strong>{displayStatus(bootstrap?.role || "guest")}</strong></div>
                <div><span>право согласования</span><strong>{canApprove ? "есть" : "нет"}</strong></div>
                <div><span>запись согласований</span><strong>{bootstrap?.features?.approvalsWritable ? "включена" : "выключена"}</strong></div>
              </div>
            </section>

            <section className="settings-action-grid">
              <button onClick={openLogs}>
                <FileText size={18} />
                <span>Лента логов</span>
                <strong>Открыть журнал работы</strong>
              </button>
              <button onClick={openSkills}>
                <Wrench size={18} />
                <span>Навыки</span>
                <strong>{skillsData.length || skills.length || 0} модулей</strong>
              </button>
            </section>

            <section className="settings-section">
              <div className="settings-section-head">
                <div>
                  <span>Automation</span>
                  <h3>Расписание cron</h3>
                </div>
                <StatusPill value={String(cronJobs.length)} />
              </div>
              <div className="settings-compact-list">
                {cronJobs.map((job) => (
                  <article key={job.id}>
                    <div>
                      <strong>{job.id}</strong>
                      <small>{job.schedule}</small>
                    </div>
                    <div>
                      <StatusPill value={job.last} />
                      <small>{job.next}</small>
                    </div>
                  </article>
                ))}
                {!cronJobs.length ? <div className="empty-inline">Cron-задач пока нет</div> : null}
              </div>
            </section>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="stack">
            <Panel title="Лента логов" right={<StatusPill value="live" />}>
              <div className="list">
                {logs.map((line, idx) => (
                  <article key={`${line}-${idx}`} className="list-item mono">{line}</article>
                ))}
                <button className="full" disabled={!hasMoreLogs} onClick={loadMoreLogs}>
                  {hasMoreLogs ? "Загрузить еще" : "Логов больше нет"}
                </button>
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

