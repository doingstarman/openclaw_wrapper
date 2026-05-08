import express from "express";
import { logger } from "../logger.js";
import { asyncRoute } from "../middleware/http.js";
import { getUserAccess } from "../security/accessPolicy.js";
import { validateTelegramInitData } from "../security/telegramInitData.js";
import {
  serializeAi,
  serializeApprovals,
  serializeLogsPage,
  serializeOverview,
  serializeSessions
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

  router.get("/approvals", asyncRoute(async (_req, res) => {
    res.json({ items: serializeApprovals(await dataSource.getApprovals()) });
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
