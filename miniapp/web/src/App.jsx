import { useEffect, useMemo, useState } from "react";
import { Activity, BrainCircuit, FileText, Gauge, Settings, Workflow } from "lucide-react";
import { api } from "./api/client";
import { getTelegramUserLabel, initTelegram } from "./lib/telegram";
import { clientLogger } from "./lib/logger";

const bottomNavItems = [
  { id: "overview", label: "Главная", icon: Gauge },
  { id: "ai", label: "ИИ", icon: BrainCircuit },
  { id: "agent", label: "Агент", icon: Workflow },
  { id: "settings", label: "Настройки", icon: Settings }
];

const skillsData = [
  { id: "log_analyzer", status: "enabled", health: "в норме", updated: "4 мин назад" },
  { id: "web_search", status: "disabled", health: "нужен API-ключ", updated: "1 час назад" },
  { id: "doc_summarizer", status: "enabled", health: "в норме", updated: "сегодня" },
  { id: "telegram_bridge", status: "enabled", health: "в норме", updated: "вчера" }
];

const cronJobs = [
  { id: "daily_summary", schedule: "0 9 * * *", last: "success", next: "08:59" },
  { id: "log_monitor", schedule: "*/10 * * * *", last: "failed", next: "00:08" },
  { id: "weekly_audit", schedule: "0 8 * * 1", last: "success", next: "Пн 08:00" }
];

const securityAlerts = [
  { id: "sec_01", level: "HIGH", text: "запрошен shell exec вне списка разрешений" },
  { id: "sec_02", level: "MEDIUM", text: "новый браузер запросил привязку устройства" },
  { id: "sec_03", level: "MEDIUM", text: "cron log_monitor упал 3 раза подряд" }
];

const statusLabels = {
  "1h": "1 ч",
  "24h": "24 ч",
  "7d": "7 д",
  "30d": "30 д",
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
  live: "живо",
  calendar: "календарь",
  MEDIUM: "средний",
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
  const metricName = metricOptions.find((item) => item.id === tokenMetric)?.label || "Токены";
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
      if (tab === "agent") {
        const approvalsData = await api.approvals();
        setApprovals(approvalsData.items || []);
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
    await loadTab(tab);
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
      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="loading">Загрузка...</div> : null}

      <main className="content">
        {activeTab === "overview" && overview && (
          <div className="stack">
            <section className="event-banner">
              <div className="event-banner-top">
                <span>{currentEvent.label}</span>
                <StatusPill value={currentEvent.state} />
              </div>
              <div>
                <h2>{currentEvent.title}</h2>
                <p>{currentEvent.detail}</p>
              </div>
              <div className="event-banner-foot">
                <span>Инстанс: {overview.instance}</span>
                <span>{overview.currentBot}</span>
              </div>
            </section>

            <Panel
              title="Статус системы"
              right={
                <div className="subtle subtle-icon">
                  <Activity size={14} />
                  <span>здорово</span>
                </div>
              }
            >
              <div className="card-grid">
                <article className="card">
                  <h4>Статус</h4>
                  <p>{displayStatus(overview.status)}</p>
                </article>
                <article className="card">
                  <h4>Нагрузка</h4>
                  <p>{overview.workload}</p>
                </article>
                <article className="card">
                  <h4>Здоровье</h4>
                  <p>{displayStatus(overview.health)}</p>
                </article>
                <article className="card">
                  <h4>Текущий бот</h4>
                  <p>{overview.currentBot}</p>
                </article>
              </div>
            </Panel>

            <Panel title="Операционный срез">
              <div className="kv-list">
                <div><span>последняя сессия</span><strong>{overview.operational?.lastSession || sessions[0]?.title || "-"}</strong></div>
                <div><span>последний навык</span><strong>{overview.operational?.lastSkill || skillsData[0]?.id}</strong></div>
                <div><span>последний cron</span><strong>{overview.operational?.latestCron || overview.latestCron}</strong></div>
                <div><span>ближайший cron</span><strong>{overview.operational?.nearestCron || overview.nearestCron}</strong></div>
                <div><span>основная модель</span><strong>{overview.operational?.primaryModel || primaryModel?.id || overview.primaryModel}</strong></div>
              </div>
            </Panel>

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
            <Panel title="Работа агента">
              <div className="kv-list">
                <div><span>активная сессия</span><strong>{sessions.find((item) => item.status === "running")?.title || "-"}</strong></div>
                <div><span>основная модель</span><strong>{primaryModel?.id || overview?.primaryModel || "-"}</strong></div>
                <div><span>ожидают решения</span><strong>{approvals.filter((item) => item.state === "pending").length}</strong></div>
                <div><span>режим доступа</span><StatusPill value={bootstrap?.role || "guest"} /></div>
              </div>
            </Panel>

            <Panel title="Согласования" right={<StatusPill value={String(approvals.length)} />}>
              <div className="list">
                {approvals.map((a) => (
                  <article key={a.id} className="list-item approval-item">
                    <div>
                      <strong>{a.id}</strong>
                      <div>{a.title}</div>
                      <small>{a.meta}</small>
                    </div>
                    <div className="approval-meta">
                      <StatusPill value={a.risk} />
                      <StatusPill value={a.state} />
                      <div className="approval-actions">
                        <button className="approve-button" disabled={!canApprove || a.state !== "pending"} onClick={() => onApproveAction(a.id, "approve")}>Одобрить</button>
                        <button className="reject-button" disabled={!canApprove || a.state !== "pending"} onClick={() => onApproveAction(a.id, "reject")}>Отклонить</button>
                      </div>
                    </div>
                  </article>
                ))}
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
          </div>
        )}

        {activeTab === "settings" && (
          <div className="stack">
            <Panel title="Настройки агента">
              <div className="kv-list">
                <div><span>имя агента</span><strong>warframe-operator</strong></div>
                <div><span>режим политики</span><strong>сбалансированный</strong></div>
                <div><span>рассуждение</span><strong>адаптивное</strong></div>
                <div><span>согласования exec</span><StatusPill value="MEDIUM" /></div>
                <div><span>модель по умолчанию</span><strong>{primaryModel?.id || overview?.primaryModel || "-"}</strong></div>
              </div>
            </Panel>

            <Panel title="Журнал работы">
              <button className="full menu-action" onClick={openLogs}>
                <FileText size={16} />
                <span>Открыть ленту логов</span>
              </button>
            </Panel>

            <Panel title="Навыки">
              <div className="list">
                {skillsData.map((s) => (
                  <article key={s.id} className="list-item">
                    <div>
                      <strong>{s.id}</strong>
                      <small>здоровье: {s.health} | обновлен: {s.updated}</small>
                    </div>
                    <StatusPill value={s.status} />
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Расписание cron">
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

            <Panel title="Доступ Telegram">
              <div className="kv-list">
                <div><span>пользователь</span><strong>{userLabel}</strong></div>
                <div><span>роль</span><StatusPill value={bootstrap?.role || "guest"} /></div>
                <div><span>право согласования</span><strong>{canApprove ? "есть" : "нет"}</strong></div>
                <div><span>запись согласований</span><strong>{bootstrap?.features?.approvalsWritable ? "включена" : "выключена"}</strong></div>
              </div>
            </Panel>
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

