import fs from "node:fs/promises";
import path from "node:path";
import { mockAi, mockLogs, mockOverview, mockSessions, mockSkills, mockSubagents, seedApprovals } from "../data/mockData.js";
import { logger } from "../logger.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const withTimeout = async (promise, timeoutMs) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Gateway request timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
};

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const sanitize = (value = "") =>
  String(value)
    .replace(/\b\d{8,12}:[A-Za-z0-9_-]{25,}\b/g, "[telegram-token]")
    .replace(/\b[a-f0-9]{40,}\b/gi, "[secret]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [secret]");

const compactNumber = (value = 0) => {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 1 : 2)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 100_000 ? 0 : 1)}k`;
  return String(number);
};

const relativeTime = (timestamp) => {
  const ms = Number(timestamp || 0);
  if (!ms) return "нет данных";
  const delta = Math.max(0, Date.now() - ms);
  if (delta < 60_000) return "только что";
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)} мин назад`;
  if (delta < DAY_MS) return `${Math.round(delta / 3_600_000)} ч назад`;
  return `${Math.round(delta / DAY_MS)} д назад`;
};

const readLastJsonlEvents = async (filePath, limit = 80) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .trim()
      .split("\n")
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
};

const textFromContent = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return part.text;
      if (part?.type === "toolCall") return `tool:${part.name}`;
      if (part?.type === "toolResult") return `result:${part.toolName || "tool"}`;
      return "";
    })
    .filter(Boolean)
    .join(" ");
};

const sessionTitle = async (stateDir, session) => {
  const file = session.sessionFile || `${session.sessionId}.jsonl`;
  const filePath = path.isAbsolute(file)
    ? file.replace(/^\/root\/\.openclaw/, stateDir)
    : path.join(stateDir, "agents/main/sessions", file);
  const events = await readLastJsonlEvents(filePath, 120);
  const userEvent = [...events].reverse().find((event) => event?.message?.role === "user");
  const assistantEvent = [...events].reverse().find((event) => event?.message?.role === "assistant");
  const title = sanitize(textFromContent(userEvent?.message?.content)).replace(/\s+/g, " ").trim();
  const last = sanitize(textFromContent(assistantEvent?.message?.content)).replace(/\s+/g, " ").trim();
  return {
    title: title ? title.slice(0, 64) : session.key || session.sessionId,
    last: last ? last.slice(0, 96) : relativeTime(session.updatedAt)
  };
};

const subagentStatus = (value = {}) => {
  if (value.abortedLastRun) return "killed";
  if (value.status === "running") return "running";
  if (value.status === "failed") return "failed";
  if (value.status === "timeout" || value.timedOut) return "timed_out";
  return value.status || "completed";
};

const loadSubagentsFromState = async (stateDir) => {
  const sessionsPath = path.join(stateDir, "agents/main/sessions/sessions.json");
  const sessionsObject = await readJson(sessionsPath, {});
  const items = await Promise.all(
    Object.entries(sessionsObject || {})
      .filter(([key]) => key.includes(":subagent:"))
      .map(async ([key, value]) => {
        const meta = await sessionTitle(stateDir, { ...value, key });
        const status = subagentStatus(value);
        return {
          id: value.runId || value.taskId || key,
          label: value.label || meta.title || key.split(":").pop(),
          task: meta.title || value.task || "Subagent task",
          status,
          outcome: value.terminalOutcome || (status === "completed" ? "success" : null),
          requesterSessionKey: value.requesterSessionKey || value.parentSessionKey || "agent:main:main",
          childSessionKey: key,
          model: [value.modelProvider, value.model].filter(Boolean).join("/") || value.model || "default",
          thinking: value.thinking || "default",
          createdAt: value.createdAt || value.updatedAt || 0,
          updatedAt: value.updatedAt || value.lastEventAt || value.createdAt || 0,
          summary: value.terminalSummary || value.progressSummary || meta.last || relativeTime(value.updatedAt),
          lastAction: null
        };
      })
  );
  return items.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
};

const loadOpenClawState = async (stateDir) => {
  const config = await readJson(path.join(stateDir, "openclaw.json"), {});
  const sessionsPath = path.join(stateDir, "agents/main/sessions/sessions.json");
  const sessionsObject = await readJson(sessionsPath, {});
  const sessions = await Promise.all(
    Object.entries(sessionsObject || {}).map(async ([key, value]) => {
      const meta = await sessionTitle(stateDir, { ...value, key });
      const percentUsed = value.contextTokens
        ? Math.round((Number(value.totalTokens || 0) / Number(value.contextTokens)) * 100)
        : 0;
      return {
        id: key,
        key,
        sessionId: value.sessionId,
        title: meta.title,
        model: [value.modelProvider, value.model].filter(Boolean).join("/") || value.model || "-",
        status: value.status === "running" ? "running" : value.abortedLastRun ? "paused" : "idle",
        last: meta.last,
        tokens: compactNumber(value.totalTokens || 0),
        updatedAt: value.updatedAt || 0,
        inputTokens: Number(value.inputTokens || 0),
        outputTokens: Number(value.outputTokens || 0),
        cacheTokens: Number(value.cacheRead || 0) + Number(value.cacheWrite || 0),
        totalTokens: Number(value.totalTokens || 0),
        costUsd: Number(value.estimatedCostUsd || 0),
        contextTokens: Number(value.contextTokens || 0),
        percentUsed
      };
    })
  );
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);

  const cronJobs = await readJson(path.join(stateDir, "cron/jobs.json"), { jobs: [] });
  const jobs = Array.isArray(cronJobs?.jobs) ? cronJobs.jobs : Array.isArray(cronJobs) ? cronJobs : [];
  const approvalsConfig = await readJson(path.join(stateDir, "exec-approvals.json"), {});
  const pairedDevices = await readJson(path.join(stateDir, "devices/paired.json"), []);
  const pendingDevices = await readJson(path.join(stateDir, "devices/pending.json"), []);
  const configHealthExists = await exists(path.join(stateDir, "logs/config-health.json"));
  const primaryFull = config?.agents?.defaults?.model?.primary || config?.agents?.defaults?.model || "unknown";
  const primaryModel = String(primaryFull).split("/").pop();
  const gatewayPort = config?.gateway?.port || 18789;
  const telegramEnabled = config?.channels?.telegram?.enabled === true;
  const activeSessions = sessions.filter((s) => Date.now() - s.updatedAt < 30 * 60 * 1000).length;
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const inputTokens = sessions.reduce((sum, s) => sum + s.inputTokens, 0);
  const outputTokens = sessions.reduce((sum, s) => sum + s.outputTokens, 0);
  const cacheTokens = sessions.reduce((sum, s) => sum + s.cacheTokens, 0);
  const costUsd = sessions.reduce((sum, s) => sum + s.costUsd, 0);

  const securityAlerts = [];
  if (pendingDevices.length) securityAlerts.push({ id: "pending_devices", level: "MEDIUM", text: `${pendingDevices.length} устройств ожидают привязки` });
  if (approvalsConfig?.effectivePolicy?.scopes?.some((s) => s?.ask?.effective === "off")) {
    securityAlerts.push({ id: "exec_yolo", level: "MEDIUM", text: "exec approvals сейчас в режиме ask=off" });
  }
  if (!telegramEnabled) securityAlerts.push({ id: "telegram_off", level: "HIGH", text: "Telegram канал выключен" });

  const skills = Object.values(sessionsObject || {})[0]?.skillsSnapshot?.skills || [];
  const skillItems = Array.isArray(skills)
    ? skills.slice(0, 24).map((skill, index) => ({
        id: skill.name || skill.id || `skill_${index + 1}`,
        name: skill.displayName || skill.name || skill.id || `Навык ${index + 1}`,
        description: skill.description || "Навык найден в локальном snapshot OpenClaw.",
        status: skill.disabled ? "inactive" : "active",
        health: "ok",
        source: skill.source || "snapshot",
        installedAt: skill.installedAt || null,
        lastRunAt: skill.lastRunAt || null,
        lastResult: skill.lastResult || "unknown",
        version: skill.version || "-",
        runs: Number(skill.runs || 0),
        triggers: skill.triggers || [],
        dependencies: skill.dependencies || [],
        logs: [`Навык ${skill.name || skill.id || index + 1} загружен из snapshot OpenClaw`]
      }))
    : [];

  const overview = {
    status: "online",
    workload: `${activeSessions} активных / ${sessions.length} всего`,
    health: configHealthExists ? "stable" : "unknown",
    currentBot: telegramEnabled ? "telegram-main" : "telegram-off",
    instance: `srv1366572 · gateway:${gatewayPort}`,
    latestCron: jobs[0]?.name || jobs[0]?.id || "нет cron jobs",
    nearestCron: jobs.find((job) => job.enabled !== false)?.name || "нет активных cron",
    primaryModel,
    currentEvent: sessions[0]
      ? {
          source: "session",
          title: sessions[0].title,
          detail: `${sessions[0].last} · ${relativeTime(sessions[0].updatedAt)}`,
          state: sessions[0].status
        }
      : null,
    operational: {
      lastSession: sessions[0]?.title || "нет сессий",
      lastSkill: skillItems[0]?.id || "нет данных",
      latestCron: jobs[0]?.name || jobs[0]?.id || "нет cron jobs",
      nearestCron: jobs.find((job) => job.enabled !== false)?.name || "нет активных cron",
      primaryModel: primaryFull,
      pairedDevices: Array.isArray(pairedDevices) ? pairedDevices.length : 0
    },
    securityAlerts,
    skills: skillItems,
    cronJobs: jobs.slice(0, 12).map((job) => ({
      id: job.name || job.id || job.jobId || "cron",
      schedule: job.schedule?.expr || job.schedule?.kind || "-",
      last: job.enabled === false ? "disabled" : "enabled",
      next: job.nextRunAt ? new Date(job.nextRunAt).toLocaleString("ru-RU") : "-"
    }))
  };

  const modelMap = new Map();
  for (const session of sessions) {
    const id = session.model || primaryFull;
    const item = modelMap.get(id) || { id, requests: 0, tokens: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0, costUsd: 0 };
    item.requests += 1;
    item.tokens += session.totalTokens;
    item.inputTokens += session.inputTokens;
    item.outputTokens += session.outputTokens;
    item.cacheTokens += session.cacheTokens;
    item.costUsd += session.costUsd;
    modelMap.set(id, item);
  }
  const models = [...modelMap.values()].map((model, index) => ({
    ...model,
    reasoningTokens: 0,
    latency: "-",
    share: totalTokens ? Math.round((model.tokens / totalTokens) * 100) : 0,
    role: index === 0 ? "primary" : "fallback"
  }));
  const totals = {
    totalTokens,
    inputTokens,
    outputTokens,
    reasoningTokens: 0,
    cacheTokens,
    requests: sessions.length,
    costUsd
  };
  const timeseries = sessions.slice(0, 8).reverse().map((session) => ({
    label: relativeTime(session.updatedAt).replace(" назад", ""),
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens,
    requests: 1,
    costUsd: session.costUsd
  }));
  const ai = {
    totals: { ...totals, tokens24h: compactNumber(totalTokens), approxBudgetUsd: costUsd.toFixed(2) },
    primaryModel: primaryFull,
    fallbackModels: models.slice(1).map((m) => m.id),
    ranges: ["24h", "all"],
    rangeMetrics: {
      "24h": { totals, byModel: models, timeseries },
      all: { totals, byModel: models, timeseries }
    },
    models
  };

  const approvals = securityAlerts.map((alert) => ({
    id: alert.id,
    title: alert.text,
    risk: alert.level,
    meta: "OpenClaw local state",
    state: "pending"
  }));

  return { config, overview, sessions, ai, approvals };
};

export const createMiniappDataSource = ({ openclawGatewayUrl, openclawGatewayToken, requestTimeoutMs }) => {
  const approvals = seedApprovals();
  const skills = mockSkills.map((skill) => ({ ...skill, logs: [...(skill.logs || [])] }));
  const subagents = mockSubagents.map((item) => ({ ...item }));
  const logs = [...mockLogs];
  const stateDir = process.env.OPENCLAW_STATE_DIR || "/host/openclaw";

  const fetchGateway = async (requestPath) => {
    if (!openclawGatewayUrl) {
      return null;
    }
    const base = openclawGatewayUrl.replace(/\/+$/, "");
    const response = await withTimeout(
      fetch(`${base}${requestPath}`, {
        headers: {
          ...(openclawGatewayToken
            ? { Authorization: `Bearer ${openclawGatewayToken}` }
            : {})
        }
      }),
      requestTimeoutMs
    );
    if (!response.ok) {
      throw new Error(`Gateway request failed with ${response.status}`);
    }
    return response.json();
  };

  const safeGatewayRead = async (requestPath, fallback) => {
    try {
      const payload = await fetchGateway(requestPath);
      return payload || fallback;
    } catch (error) {
      logger.warn("gateway.fallback", {
        path: requestPath,
        reason: error.message
      });
      return fallback;
    }
  };

  const safeState = async () => {
    try {
      if (!(await exists(path.join(stateDir, "openclaw.json")))) return null;
      return await loadOpenClawState(stateDir);
    } catch (error) {
      logger.warn("openclaw.state.fallback", { reason: error.message });
      return null;
    }
  };

  const getLogsPage = async (cursor, limit = 12) => {
    const state = await safeState();
    if (!state) {
      const offset = Number(cursor || 0);
      const bounded = Number.isNaN(offset) ? 0 : Math.max(0, offset);
      const items = logs.slice(bounded, bounded + limit);
      const next = bounded + items.length;
      return { items, nextCursor: String(next), hasMore: next < logs.length };
    }

    const latestSession = state.sessions[0];
    const filePath = latestSession?.sessionId
      ? path.join(stateDir, "agents/main/sessions", `${latestSession.sessionId}.jsonl`)
      : path.join(stateDir, "logs/config-audit.jsonl");
    const events = await readLastJsonlEvents(filePath, 160);
    const allItems = events.map((event) => {
      const role = event?.message?.role || event?.type || "event";
      const text = textFromContent(event?.message?.content) || event?.toolName || event?.message || "обновление";
      return `[${event.timestamp || new Date().toISOString()}] ${role}: ${sanitize(text).replace(/\s+/g, " ").slice(0, 220)}`;
    }).reverse();
    const offset = Number(cursor || 0);
    const bounded = Number.isNaN(offset) ? 0 : Math.max(0, offset);
    const items = allItems.slice(bounded, bounded + limit);
    const next = bounded + items.length;
    return { items, nextCursor: String(next), hasMore: next < allItems.length };
  };

  return {
    getBootstrap: async () => {
      const state = await safeState();
      return safeGatewayRead("/api/miniapp/bootstrap", {
        status: state ? "live-local-state" : "mock-fallback",
        runtimeVersion: state?.config?.runtimeVersion,
        gatewayPort: state?.config?.gateway?.port || 18789
      });
    },
    getOverview: async () => (await safeState())?.overview || safeGatewayRead("/api/miniapp/overview", mockOverview),
    getSessions: async () => (await safeState())?.sessions || safeGatewayRead("/api/miniapp/sessions", mockSessions),
    getAi: async () => (await safeState())?.ai || safeGatewayRead("/api/miniapp/ai", mockAi),
    getSkills: async () => (await safeState())?.overview?.skills || safeGatewayRead("/api/miniapp/skills", skills),
    getSkill: async (skillId) => {
      const stateSkill = (await safeState())?.overview?.skills.find((skill) => skill.id === skillId);
      if (stateSkill) return stateSkill;
      const fallbackSkills = await safeGatewayRead("/api/miniapp/skills", skills);
      return fallbackSkills.find((skill) => skill.id === skillId) || null;
    },
    updateSkill: async (skillId, action, actorId) => {
      const item = skills.find((skill) => skill.id === skillId);
      if (!item) return null;
      if (action === "enable") {
        item.status = "active";
        item.health = item.health === "missing_key" ? "needs_config" : "ok";
      }
      if (action === "disable") item.status = "inactive";
      if (action === "check") {
        item.lastRunAt = new Date().toISOString();
        item.lastResult = item.status === "needs_config" ? "not_configured" : "success";
        item.runs = Number(item.runs || 0) + 1;
        item.logs = [
          `[${new Date().toISOString()}] проверка запущена пользователем ${actorId}`,
          ...(item.logs || [])
        ].slice(0, 8);
      }
      logs.unshift(`[${new Date().toISOString()}] skill.${skillId} ${action} by ${actorId}`);
      return item;
    },
    getApprovals: async () => (await safeState())?.approvals || safeGatewayRead("/api/miniapp/approvals", approvals),
    getSubagents: async () => {
      try {
        if (await exists(path.join(stateDir, "agents/main/sessions/sessions.json"))) {
          const live = await loadSubagentsFromState(stateDir);
          if (live.length) return live;
        }
      } catch (error) {
        logger.warn("openclaw.subagents.fallback", { reason: error.message });
      }
      return safeGatewayRead("/api/miniapp/subagents", subagents);
    },
    updateSubagent: async (subagentId, action, actorId, message = "") => {
      const live = await loadSubagentsFromState(stateDir).catch(() => []);
      const item = live.find((entry) => entry.id === subagentId || entry.childSessionKey === subagentId)
        || subagents.find((entry) => entry.id === subagentId || entry.childSessionKey === subagentId);
      if (!item) return null;
      const stamp = new Date().toISOString();
      item.lastAction = action === "steer"
        ? `steer by ${actorId}: ${sanitize(message).slice(0, 160)}`
        : `kill requested by ${actorId}`;
      if (action === "kill") {
        item.status = "killed";
        item.outcome = "cancelled";
        item.summary = "Остановка запрошена из Mini App. Если это live-run, действие будет доступно через OpenClaw bridge после подключения write API.";
      }
      if (action === "steer") {
        item.summary = `Инструкция сохранена: ${sanitize(message).slice(0, 180) || "пустое сообщение"}`;
      }
      item.updatedAt = Date.now();
      logs.unshift(`[${stamp}] subagent.${subagentId} ${action} by ${actorId}`);
      return item;
    },
    approve: async (approvalId, action, actorId) => {
      const item = approvals.find((a) => a.id === approvalId) || (await safeState())?.approvals.find((a) => a.id === approvalId);
      if (!item) return null;
      item.state = action === "approve" ? "approved" : "rejected";
      logs.unshift(`[${new Date().toISOString()}] approval.${approvalId} ${item.state} by ${actorId}`);
      return item;
    },
    getLogs: async (cursor) => safeGatewayRead(`/api/miniapp/logs?cursor=${cursor || 0}`, await getLogsPage(cursor))
  };
};
