export const mockOverview = {
  status: "online",
  workload: "6 активных",
  health: "stable",
  currentBot: "telegram-main",
  instance: "prod-eu-1",
  latestCron: "log_monitor",
  nearestCron: "daily_summary",
  primaryModel: "gpt-oss:120b",
  currentEvent: {
    source: "calendar",
    title: "Созвон по интеграции OpenClaw",
    detail: "Сегодня 16:30 · подготовить вопросы по gateway, токенам и Telegram-доступу",
    state: "calendar"
  },
  operational: {
    lastSession: "отчет по стартапам",
    lastSkill: "анализ логов после ночного cron",
    latestCron: "проверка стабильности логов",
    nearestCron: "утренний отчет по агенту",
    primaryModel: "основная модель для рабочих задач"
  }
};

export const mockSessions = [
  {
    id: "session_4821",
    title: "отчет по стартапам",
    model: "gpt-oss:120b",
    status: "running",
    last: "анализ завершен",
    tokens: "12.4k"
  },
  {
    id: "session_4820",
    title: "настройка CLI",
    model: "qwen-coder",
    status: "idle",
    last: "ожидает команду",
    tokens: "5.2k"
  },
  {
    id: "session_4818",
    title: "аудит деплоя mini app",
    model: "deepseek-r1",
    status: "paused",
    last: "ожидает exec-согласование",
    tokens: "17.9k"
  }
];

export const mockSkills = [
  {
    id: "log_analyzer",
    name: "Анализ логов",
    description: "Ищет ошибки, повторяющиеся сбои и подозрительные события в логах OpenClaw.",
    status: "active",
    health: "ok",
    source: "custom",
    installedAt: "2026-05-12T10:00:00Z",
    lastRunAt: "2026-05-20T14:22:00Z",
    lastResult: "success",
    version: "0.1.0",
    runs: 184,
    triggers: ["logs.updated", "cron.log_monitor"],
    dependencies: ["OPENCLAW_STATE_DIR"],
    logs: [
      "[14:22:01] найдено 0 критических ошибок",
      "[14:21:58] обработано 128 строк логов",
      "[14:21:55] запуск проверки логов"
    ]
  },
  {
    id: "telegram_bridge",
    name: "Telegram-мост",
    description: "Связывает OpenClaw с Telegram-каналом, mini app и проверкой initData.",
    status: "active",
    health: "ok",
    source: "official",
    installedAt: "2026-05-10T09:30:00Z",
    lastRunAt: "2026-05-20T13:48:00Z",
    lastResult: "success",
    version: "0.2.1",
    runs: 73,
    triggers: ["telegram.message", "telegram.webapp"],
    dependencies: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USER_IDS"],
    logs: [
      "[13:48:05] initData проверена",
      "[13:48:04] пользователь найден в allowlist",
      "[13:48:02] входящий mini app bootstrap"
    ]
  },
  {
    id: "doc_summarizer",
    name: "Сводки документов",
    description: "Сжимает длинные документы и сохраняет короткие рабочие выжимки для агента.",
    status: "inactive",
    health: "idle",
    source: "custom",
    installedAt: "2026-05-08T18:10:00Z",
    lastRunAt: "2026-05-18T19:44:00Z",
    lastResult: "success",
    version: "0.1.3",
    runs: 41,
    triggers: ["file.created"],
    dependencies: [],
    logs: [
      "[19:44:31] сводка сохранена",
      "[19:44:12] документ разбит на 9 блоков",
      "[19:44:09] запуск суммаризации"
    ]
  },
  {
    id: "web_search",
    name: "Поиск в интернете",
    description: "Ищет свежую информацию в сети и возвращает источники для проверки.",
    status: "needs_config",
    health: "missing_key",
    source: "community",
    installedAt: "2026-05-16T11:05:00Z",
    lastRunAt: null,
    lastResult: "not_configured",
    version: "0.0.8",
    runs: 0,
    triggers: ["manual"],
    dependencies: ["SEARCH_API_KEY"],
    logs: [
      "[11:05:10] навык установлен",
      "[11:05:11] SEARCH_API_KEY не найден"
    ]
  }
];

export const mockSubagents = [
  {
    id: "calendar_manager",
    label: "Агент управления календарём",
    task: "Следит за расписанием, ближайшими событиями и напоминаниями",
    status: "running",
    outcome: null,
    requesterSessionKey: "agent:main:telegram:direct:1037751541",
    childSessionKey: "agent:main:subagent:calendar-manager",
    model: "default",
    thinking: "medium",
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    updatedAt: Date.now() - 1000 * 60 * 12,
    summary: "Календарь под наблюдением. Готов подсветить ближайшие события и конфликты.",
    nextEvent: "Созвон по интеграции OpenClaw",
    nextEventAt: "сегодня 16:30",
    lastAction: null
  }
];

export const mockAi = {
  totals: {
    tokens24h: "1.53M",
    approxBudgetUsd: "18.40",
    totalTokens: 1530000,
    inputTokens: 910000,
    outputTokens: 620000,
    requests: 480
  },
  primaryModel: "gpt-oss:120b",
  fallbackModels: ["qwen-coder", "deepseek-r1"],
  ranges: ["1h", "24h", "7d", "30d", "all"],
  rangeMetrics: {
    "1h": {
      totals: {
        totalTokens: 128000,
        inputTokens: 78000,
        outputTokens: 42000,
        reasoningTokens: 6000,
        cacheTokens: 2000,
        requests: 41,
        costUsd: 1.72
      },
      byModel: [
        { id: "gpt-oss:120b", role: "primary", tokens: 69000, inputTokens: 41000, outputTokens: 23000, requests: 22, costUsd: 0.94, latency: "4.1s" },
        { id: "qwen-coder", role: "fallback", tokens: 37000, inputTokens: 24000, outputTokens: 11000, requests: 14, costUsd: 0.43, latency: "1.7s" },
        { id: "deepseek-r1", role: "fallback", tokens: 22000, inputTokens: 13000, outputTokens: 8000, requests: 5, costUsd: 0.35, latency: "6.2s" }
      ],
      timeseries: [
        { label: "00", inputTokens: 9000, outputTokens: 5000, requests: 4, costUsd: 0.18 },
        { label: "10", inputTokens: 12000, outputTokens: 6400, requests: 6, costUsd: 0.24 },
        { label: "20", inputTokens: 10500, outputTokens: 5400, requests: 5, costUsd: 0.21 },
        { label: "30", inputTokens: 16000, outputTokens: 9000, requests: 8, costUsd: 0.35 },
        { label: "40", inputTokens: 14200, outputTokens: 7800, requests: 7, costUsd: 0.31 },
        { label: "50", inputTokens: 16300, outputTokens: 8400, requests: 11, costUsd: 0.43 }
      ]
    },
    "24h": {
      totals: {
        totalTokens: 1530000,
        inputTokens: 910000,
        outputTokens: 512000,
        reasoningTokens: 71000,
        cacheTokens: 37000,
        requests: 480,
        costUsd: 18.4
      },
      byModel: [
        { id: "gpt-oss:120b", role: "primary", tokens: 800000, inputTokens: 490000, outputTokens: 264000, requests: 320, costUsd: 10.34, latency: "4.2s" },
        { id: "qwen-coder", role: "fallback", tokens: 420000, inputTokens: 260000, outputTokens: 132000, requests: 120, costUsd: 4.21, latency: "1.8s" },
        { id: "deepseek-r1", role: "fallback", tokens: 310000, inputTokens: 160000, outputTokens: 116000, requests: 40, costUsd: 3.85, latency: "6.5s" }
      ],
      timeseries: [
        { label: "00", inputTokens: 52000, outputTokens: 30000, requests: 28, costUsd: 1.18 },
        { label: "04", inputTokens: 64000, outputTokens: 36000, requests: 35, costUsd: 1.42 },
        { label: "08", inputTokens: 122000, outputTokens: 72000, requests: 62, costUsd: 2.55 },
        { label: "12", inputTokens: 188000, outputTokens: 108000, requests: 98, costUsd: 3.84 },
        { label: "16", inputTokens: 216000, outputTokens: 124000, requests: 116, costUsd: 4.44 },
        { label: "20", inputTokens: 268000, outputTokens: 142000, requests: 141, costUsd: 5.01 }
      ]
    },
    "7d": {
      totals: {
        totalTokens: 8420000,
        inputTokens: 4980000,
        outputTokens: 2870000,
        reasoningTokens: 382000,
        cacheTokens: 188000,
        requests: 2740,
        costUsd: 98.6
      },
      byModel: [
        { id: "gpt-oss:120b", role: "primary", tokens: 4680000, inputTokens: 2760000, outputTokens: 1600000, requests: 1720, costUsd: 55.4, latency: "4.3s" },
        { id: "qwen-coder", role: "fallback", tokens: 2120000, inputTokens: 1320000, outputTokens: 690000, requests: 730, costUsd: 21.8, latency: "1.9s" },
        { id: "deepseek-r1", role: "fallback", tokens: 1620000, inputTokens: 900000, outputTokens: 580000, requests: 290, costUsd: 21.4, latency: "6.7s" }
      ],
      timeseries: [
        { label: "Пн", inputTokens: 560000, outputTokens: 320000, requests: 300, costUsd: 11.1 },
        { label: "Вт", inputTokens: 620000, outputTokens: 380000, requests: 350, costUsd: 12.6 },
        { label: "Ср", inputTokens: 680000, outputTokens: 390000, requests: 390, costUsd: 13.2 },
        { label: "Чт", inputTokens: 760000, outputTokens: 430000, requests: 430, costUsd: 15.2 },
        { label: "Пт", inputTokens: 850000, outputTokens: 510000, requests: 485, costUsd: 17.6 },
        { label: "Сб", inputTokens: 710000, outputTokens: 390000, requests: 385, costUsd: 13.7 },
        { label: "Вс", inputTokens: 800000, outputTokens: 450000, requests: 400, costUsd: 15.2 }
      ]
    },
    "30d": {
      totals: {
        totalTokens: 39200000,
        inputTokens: 23100000,
        outputTokens: 13400000,
        reasoningTokens: 1850000,
        cacheTokens: 850000,
        requests: 12480,
        costUsd: 452.7
      },
      byModel: [
        { id: "gpt-oss:120b", role: "primary", tokens: 20900000, inputTokens: 12400000, outputTokens: 7100000, requests: 7520, costUsd: 246.2, latency: "4.4s" },
        { id: "qwen-coder", role: "fallback", tokens: 10800000, inputTokens: 6700000, outputTokens: 3500000, requests: 3560, costUsd: 108.8, latency: "1.9s" },
        { id: "deepseek-r1", role: "fallback", tokens: 7500000, inputTokens: 4000000, outputTokens: 2800000, requests: 1400, costUsd: 97.7, latency: "6.8s" }
      ],
      timeseries: [
        { label: "Н1", inputTokens: 4800000, outputTokens: 2700000, requests: 2600, costUsd: 94.1 },
        { label: "Н2", inputTokens: 5600000, outputTokens: 3300000, requests: 3100, costUsd: 113.6 },
        { label: "Н3", inputTokens: 6100000, outputTokens: 3600000, requests: 3380, costUsd: 124.5 },
        { label: "Н4", inputTokens: 6600000, outputTokens: 3800000, requests: 3400, costUsd: 120.5 }
      ]
    },
    all: {
      totals: {
        totalTokens: 128600000,
        inputTokens: 75800000,
        outputTokens: 43800000,
        reasoningTokens: 6200000,
        cacheTokens: 2800000,
        requests: 40200,
        costUsd: 1468.9
      },
      byModel: [
        { id: "gpt-oss:120b", role: "primary", tokens: 68800000, inputTokens: 41000000, outputTokens: 23300000, requests: 24800, costUsd: 812.3, latency: "4.5s" },
        { id: "qwen-coder", role: "fallback", tokens: 34800000, inputTokens: 21600000, outputTokens: 11300000, requests: 11200, costUsd: 345.1, latency: "2.0s" },
        { id: "deepseek-r1", role: "fallback", tokens: 25000000, inputTokens: 13200000, outputTokens: 9200000, requests: 4200, costUsd: 311.5, latency: "6.9s" }
      ],
      timeseries: [
        { label: "Янв", inputTokens: 8400000, outputTokens: 4800000, requests: 4300, costUsd: 161.2 },
        { label: "Фев", inputTokens: 11200000, outputTokens: 6500000, requests: 5700, costUsd: 214.6 },
        { label: "Мар", inputTokens: 15600000, outputTokens: 9100000, requests: 8100, costUsd: 298.4 },
        { label: "Апр", inputTokens: 18800000, outputTokens: 10800000, requests: 9800, costUsd: 358.1 },
        { label: "Май", inputTokens: 21800000, outputTokens: 12600000, requests: 12300, costUsd: 436.6 }
      ]
    }
  },
  models: [
    {
      id: "gpt-oss:120b",
      requests: 320,
      tokens: 800000,
      inputTokens: 490000,
      outputTokens: 264000,
      costUsd: 10.34,
      latency: "4.2s",
      share: 52,
      role: "primary"
    },
    {
      id: "qwen-coder",
      requests: 120,
      tokens: 420000,
      inputTokens: 260000,
      outputTokens: 132000,
      costUsd: 4.21,
      latency: "1.8s",
      share: 27,
      role: "fallback"
    },
    {
      id: "deepseek-r1",
      requests: 40,
      tokens: 310000,
      inputTokens: 160000,
      outputTokens: 116000,
      costUsd: 3.85,
      latency: "6.5s",
      share: 21,
      role: "fallback"
    }
  ]
};

export const seedApprovals = () => [
  {
    id: "exec_request_91",
    title: "запуск shell-команды",
    risk: "HIGH",
    meta: "rm -rf /tmp/cache",
    state: "pending"
  },
  {
    id: "device_pair",
    title: "привязка нового устройства",
    risk: "MEDIUM",
    meta: "Chrome / новый IP / starman",
    state: "pending"
  }
];

export const mockLogs = [
  "[10:42:11] gateway.health в норме",
  "[10:42:18] agent.config обновлен",
  "[10:42:24] cron.log_monitor завершился ошибкой",
  "[10:42:31] skill.doc_summarizer обновлен",
  "[10:42:48] approval.exec_request_91 ожидает решения",
  "[10:43:02] model.gpt-oss:120b задержка 4.2с",
  "[10:43:11] session.session_4821 в работе",
  "[10:43:41] approval.device_pair ожидает решения",
  "[10:44:01] gateway.health в норме"
];
