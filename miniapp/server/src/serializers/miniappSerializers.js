export const serializeOverview = (input) => ({
  status: input.status,
  workload: input.workload,
  health: input.health,
  currentBot: input.currentBot,
  instance: input.instance,
  latestCron: input.latestCron,
  nearestCron: input.nearestCron,
  primaryModel: input.primaryModel,
  currentEvent: input.currentEvent,
  operational: input.operational,
  securityAlerts: input.securityAlerts || [],
  skills: input.skills || [],
  cronJobs: input.cronJobs || []
});

export const serializeSessions = (sessions) =>
  sessions.map((s) => ({
    id: s.id,
    title: s.title,
    model: s.model,
    status: s.status,
    last: s.last,
    tokens: s.tokens
  }));

export const serializeAi = (ai) => ({
  totals: ai.totals,
  primaryModel: ai.primaryModel,
  fallbackModels: ai.fallbackModels,
  ranges: ai.ranges,
  rangeMetrics: ai.rangeMetrics,
  models: ai.models.map((m) => ({
    id: m.id,
    requests: m.requests,
    tokens: m.tokens,
    inputTokens: m.inputTokens,
    outputTokens: m.outputTokens,
    costUsd: m.costUsd,
    latency: m.latency,
    share: m.share,
    role: m.role
  }))
});

export const serializeSkills = (skills) =>
  skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    status: skill.status,
    health: skill.health,
    source: skill.source,
    installedAt: skill.installedAt,
    lastRunAt: skill.lastRunAt,
    lastResult: skill.lastResult,
    version: skill.version,
    runs: skill.runs,
    triggers: skill.triggers || [],
    dependencies: skill.dependencies || []
  }));

export const serializeSkillDetail = (skill) => ({
  ...serializeSkills([skill])[0],
  logs: skill.logs || []
});

export const serializeAgents = (agents, actorUserId = "") =>
  agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    type: agent.type,
    status: agent.status,
    enabled: agent.enabled !== false,
    capabilities: agent.capabilities || [],
    endpoints: agent.endpoints || {},
    auth: agent.auth || { type: "none", secretRef: "" },
    ownerUserIds: agent.ownerUserIds || [],
    ownedByCurrentUser: (agent.ownerUserIds || []).map(String).includes(String(actorUserId)),
    environment: agent.environment || "",
    tags: agent.tags || [],
    health: agent.health || null,
    commands: agent.commandSchema || { actions: [] }
  }));

export const serializeAgentDetail = (agent, actorUserId = "") => ({
  ...serializeAgents([agent], actorUserId)[0],
  tasks: agent.tasks || { active: [], recent: [] },
  logs: agent.logs || []
});

export const serializeAgentAudit = (entries) =>
  entries.map((entry) => ({
    id: entry.id,
    ts: entry.ts,
    agentId: entry.agentId,
    actorUserId: entry.actorUserId,
    action: entry.action,
    danger: entry.danger,
    outcome: entry.outcome,
    summary: entry.summary
  }));

export const serializeApprovals = (approvals) =>
  approvals.map((a) => ({
    id: a.id,
    title: a.title,
    risk: a.risk,
    meta: a.meta,
    state: a.state
  }));

export const serializeLogsPage = ({ items, nextCursor, hasMore }) => ({
  items,
  nextCursor,
  hasMore
});

export const serializeSubagents = (subagents) =>
  subagents.map((item) => ({
    id: item.id,
    label: item.label,
    task: item.task,
    status: item.status,
    outcome: item.outcome,
    requesterSessionKey: item.requesterSessionKey,
    childSessionKey: item.childSessionKey,
    model: item.model,
    thinking: item.thinking,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    summary: item.summary,
    nextEvent: item.nextEvent,
    nextEventAt: item.nextEventAt,
    lastAction: item.lastAction || null
  }));
