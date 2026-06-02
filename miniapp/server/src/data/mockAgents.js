export const mockAgents = [
  {
    id: "calendar-agent",
    name: "Calendar Agent",
    type: "openclaw",
    status: "healthy",
    enabled: true,
    capabilities: ["calendar", "sync", "telegram"],
    endpoints: {
      health: "/health",
      capabilities: "/capabilities",
      control: "/control",
      logs: "/logs",
      tasks: "/tasks"
    },
    auth: { type: "bearer", secretRef: "OPENCLAW_GATEWAY_TOKEN" },
    ownerUserIds: ["42", "1037751541"],
    environment: "prod",
    tags: ["calendar", "openclaw", "prod"],
    health: {
      ok: true,
      status: "healthy",
      version: "0.2.1",
      commit: "local",
      uptimeSec: 18420,
      lastActivityAt: "2026-06-01T09:12:00.000Z",
      lastError: null
    },
    commandSchema: {
      actions: [
        { id: "sync_now", label: "Sync now", danger: "safe", params: [] },
        { id: "restart", label: "Restart", danger: "risky", params: [] },
        {
          id: "reset_cursor",
          label: "Reset cursor",
          danger: "destructive",
          params: [{ name: "source", type: "string", required: true }]
        }
      ]
    },
    tasks: {
      active: [
        {
          id: "task_cal_421",
          kind: "sync",
          status: "running",
          startedAt: "2026-06-01T09:10:00.000Z",
          finishedAt: null,
          summary: "Syncing today's events"
        }
      ],
      recent: [
        {
          id: "task_cal_420",
          kind: "sync",
          status: "success",
          startedAt: "2026-06-01T08:00:00.000Z",
          finishedAt: "2026-06-01T08:00:21.000Z",
          summary: "Synced 12 items"
        }
      ]
    },
    logs: [
      {
        ts: "2026-06-01T09:12:00.000Z",
        level: "info",
        message: "calendar sync heartbeat ok",
        source: "worker",
        fields: { durationMs: 410 }
      },
      {
        ts: "2026-06-01T08:00:21.000Z",
        level: "info",
        message: "sync completed",
        source: "worker",
        fields: { items: 12 }
      }
    ]
  },
  {
    id: "railway-support-agent",
    name: "Support Agent",
    type: "railway",
    status: "degraded",
    enabled: true,
    capabilities: ["support", "logs", "railway"],
    endpoints: {
      health: "https://support-agent.example.com/health",
      control: "railway://service/support-agent",
      logs: "railway://service/support-agent/logs",
      metrics: "railway://service/support-agent/metrics"
    },
    auth: { type: "bearer", secretRef: "RAILWAY_API_TOKEN" },
    ownerUserIds: ["42"],
    environment: "prod",
    tags: ["support", "prod", "railway"],
    health: {
      ok: false,
      status: "degraded",
      version: "1.4.0",
      commit: "b31a5f0",
      uptimeSec: 7720,
      lastActivityAt: "2026-06-01T09:06:00.000Z",
      lastError: "Queue latency above threshold"
    },
    commandSchema: {
      actions: [
        { id: "restart", label: "Restart service", danger: "risky", params: [] },
        { id: "redeploy", label: "Redeploy", danger: "risky", params: [] },
        { id: "send_digest", label: "Send support digest", danger: "external", params: [] }
      ]
    },
    tasks: {
      active: [],
      recent: [
        {
          id: "task_sup_771",
          kind: "queue",
          status: "failed",
          startedAt: "2026-06-01T08:51:00.000Z",
          finishedAt: "2026-06-01T08:52:14.000Z",
          summary: "Digest delivery timed out"
        }
      ]
    },
    logs: [
      {
        ts: "2026-06-01T09:06:00.000Z",
        level: "warn",
        message: "queue latency above threshold",
        source: "railway",
        fields: { latencyMs: 9200 }
      }
    ]
  },
  {
    id: "notion-webhook-agent",
    name: "Notion Webhook Agent",
    type: "webhook",
    status: "unknown",
    enabled: false,
    capabilities: ["notion", "webhook"],
    endpoints: {
      webhook: "https://notion-agent.example.com/webhook",
      health: "https://notion-agent.example.com/health"
    },
    auth: { type: "hmac", secretRef: "NOTION_AGENT_WEBHOOK_SECRET" },
    ownerUserIds: ["1037751541"],
    environment: "staging",
    tags: ["notion", "staging"],
    health: {
      ok: false,
      status: "unknown",
      version: "0.0.9",
      commit: "unknown",
      uptimeSec: 0,
      lastActivityAt: null,
      lastError: "Agent is disabled"
    },
    commandSchema: {
      actions: [
        { id: "resume", label: "Resume", danger: "safe", params: [] },
        { id: "reload_config", label: "Reload config", danger: "risky", params: [] }
      ]
    },
    tasks: {
      active: [],
      recent: []
    },
    logs: [
      {
        ts: "2026-05-31T18:22:00.000Z",
        level: "info",
        message: "agent disabled by owner",
        source: "registry",
        fields: {}
      }
    ]
  }
];

export const seedAgentAudit = () => [
  {
    id: "audit_agent_1",
    ts: "2026-06-01T09:12:00.000Z",
    agentId: "calendar-agent",
    actorUserId: "system",
    action: "health",
    danger: "safe",
    outcome: "accepted",
    summary: "Health check reported healthy"
  },
  {
    id: "audit_agent_2",
    ts: "2026-06-01T09:06:00.000Z",
    agentId: "railway-support-agent",
    actorUserId: "system",
    action: "health",
    danger: "safe",
    outcome: "degraded",
    summary: "Queue latency above threshold"
  }
];
