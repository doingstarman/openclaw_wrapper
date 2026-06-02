import express from "express";
import { logger } from "../logger.js";
import { asyncRoute } from "../middleware/http.js";
import { getUserAccess } from "../security/accessPolicy.js";
import { validateTelegramInitData } from "../security/telegramInitData.js";
import {
  serializeAgentAudit,
  serializeAgentDetail,
  serializeAgents,
  serializeAi,
  serializeApprovals,
  serializeSkillDetail,
  serializeSkills,
  serializeLogsPage,
  serializeOverview,
  serializeSessions,
  serializeSubagents
} from "../serializers/miniappSerializers.js";

const getInitDataFromRequest = (req) =>
  req.header("x-telegram-init-data") || req.query.initData || "";

const authGuard = ({ config }) => (req, res, next) => {
  const initDataRaw = getInitDataFromRequest(req);
  const hasInitData = Boolean(initDataRaw);

  if (config.allowInsecureDev && !hasInitData) {
    const userId = String(req.header("x-dev-user-id") || "0");
    const access = getUserAccess({
      userId,
      allowedUserIds: config.allowedUserIds,
      adminUserIds: config.adminUserIds
    });
    if (!access.allowed && config.allowedUserIds.size > 0) {
      logger.warn("auth.denied.dev", {
        requestId: req.requestId,
        userId
      });
      return res.status(403).json({ error: "User is not allowed for this mini app" });
    }
    req.auth = {
      user: { id: userId, username: "dev-user" },
      access
    };
    return next();
  }

  try {
    const payload = validateTelegramInitData({
      initDataRaw,
      botToken: config.telegramBotToken,
      maxAgeSeconds: config.maxInitDataAgeSeconds
    });

    const access = getUserAccess({
      userId: payload.user.id,
      allowedUserIds: config.allowedUserIds,
      adminUserIds: config.adminUserIds
    });
    if (!access.allowed) {
      return res.status(403).json({ error: "User is not allowed for this mini app" });
    }
    req.auth = {
      user: payload.user,
      access
    };
    return next();
  } catch (error) {
    logger.warn("auth.failed", {
      requestId: req.requestId,
      reason: error.message
    });
    return res.status(401).json({ error: error.message });
  }
};

export const createMiniappRouter = ({ config, dataSource }) => {
  const router = express.Router();
  router.use(authGuard({ config }));

  router.get("/bootstrap", asyncRoute(async (req, res) => {
    const bootstrap = await dataSource.getBootstrap();
    res.json({
      user: req.auth.user,
      role: req.auth.access.role,
      permissions: req.auth.access.permissions,
      features: {
        tabs: ["overview", "ai", "agent", "settings", "logs"],
        approvalsWritable: req.auth.access.permissions.canApprove
      },
      gateway: bootstrap
    });
  }));

  router.get("/overview", asyncRoute(async (_req, res) => {
    res.json(serializeOverview(await dataSource.getOverview()));
  }));

  router.get("/sessions", asyncRoute(async (_req, res) => {
    res.json({ items: serializeSessions(await dataSource.getSessions()) });
  }));

  router.get("/ai", asyncRoute(async (_req, res) => {
    res.json(serializeAi(await dataSource.getAi()));
  }));

  router.get("/skills", asyncRoute(async (_req, res) => {
    res.json({ items: serializeSkills(await dataSource.getSkills()) });
  }));

  router.get("/skills/:id", asyncRoute(async (req, res) => {
    const item = await dataSource.getSkill(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Skill not found" });
    }
    return res.json({ item: serializeSkillDetail(item) });
  }));

  router.post("/skills/:id/:action", asyncRoute(async (req, res) => {
    const { id, action } = req.params;
    if (!["enable", "disable", "check"].includes(action)) {
      return res.status(400).json({ error: "Unsupported skill action" });
    }
    const item = await dataSource.updateSkill(id, action, req.auth.user.id);
    if (!item) {
      return res.status(404).json({ error: "Skill not found" });
    }
    return res.json({ item: serializeSkillDetail(item) });
  }));

  router.get("/agents", asyncRoute(async (req, res) => {
    res.json({ items: serializeAgents(await dataSource.getAgents(), req.auth.user.id) });
  }));

  router.get("/agents/:id", asyncRoute(async (req, res) => {
    const item = await dataSource.getAgent(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Agent not found" });
    }
    return res.json({ item: serializeAgentDetail(item, req.auth.user.id) });
  }));

  router.get("/agents/:id/capabilities", asyncRoute(async (req, res) => {
    const capabilities = await dataSource.getAgentCapabilities(req.params.id);
    if (!capabilities) {
      return res.status(404).json({ error: "Agent not found" });
    }
    return res.json(capabilities);
  }));

  router.get("/agents/:id/logs", asyncRoute(async (req, res) => {
    const items = await dataSource.getAgentLogs(req.params.id);
    if (!items) {
      return res.status(404).json({ error: "Agent not found" });
    }
    return res.json({ items });
  }));

  router.get("/agents/:id/tasks", asyncRoute(async (req, res) => {
    const tasks = await dataSource.getAgentTasks(req.params.id);
    if (!tasks) {
      return res.status(404).json({ error: "Agent not found" });
    }
    return res.json(tasks);
  }));

  router.post("/agents/:id/control", asyncRoute(async (req, res) => {
    const result = await dataSource.controlAgent(req.params.id, req.body, req.auth.user.id);
    if (result.error) {
      return res.status(result.status || 400).json({
        error: result.error,
        requiresConfirmation: result.requiresConfirmation,
        danger: result.danger,
        action: result.action
      });
    }
    return res.status(202).json({
      accepted: result.accepted,
      jobId: result.jobId,
      item: serializeAgentDetail(result.agent, req.auth.user.id),
      audit: serializeAgentAudit([result.audit])[0]
    });
  }));

  router.get("/agent-audit", asyncRoute(async (req, res) => {
    const entries = await dataSource.getAgentAudit(req.query.agentId || "");
    res.json({ items: serializeAgentAudit(entries) });
  }));

  router.get("/approvals", asyncRoute(async (_req, res) => {
    res.json({ items: serializeApprovals(await dataSource.getApprovals()) });
  }));

  router.get("/subagents", asyncRoute(async (_req, res) => {
    res.json({ items: serializeSubagents(await dataSource.getSubagents()) });
  }));

  router.post("/subagents/:id/:action", asyncRoute(async (req, res) => {
    if (!req.auth.access.permissions.canApprove) {
      return res.status(403).json({ error: "Insufficient permissions for subagent control" });
    }
    const { id, action } = req.params;
    if (!["kill", "steer"].includes(action)) {
      return res.status(400).json({ error: "Unsupported subagent action" });
    }
    const item = await dataSource.updateSubagent(id, action, req.auth.user.id, req.body?.message || "");
    if (!item) {
      return res.status(404).json({ error: "Subagent not found" });
    }
    return res.json({ item: serializeSubagents([item])[0] });
  }));

  router.post("/approvals/:id/:action", asyncRoute(async (req, res) => {
    if (!req.auth.access.permissions.canApprove) {
      return res.status(403).json({ error: "Insufficient permissions for approvals" });
    }
    const { id, action } = req.params;
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({ error: "Unsupported action" });
    }
    const item = await dataSource.approve(id, action, req.auth.user.id);
    if (!item) {
      return res.status(404).json({ error: "Approval not found" });
    }
    return res.json({ item });
  }));

  router.get("/logs", asyncRoute(async (req, res) => {
    const payload = await dataSource.getLogs(req.query.cursor || "0");
    res.json(serializeLogsPage(payload));
  }));

  return router;
};
