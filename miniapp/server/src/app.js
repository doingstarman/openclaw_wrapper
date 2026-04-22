import express from "express";
import fs from "node:fs";
import path from "node:path";
import { config as defaultConfig } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler, notFoundHandler, requestContext, requestLogger } from "./middleware/http.js";
import { createMiniappRouter } from "./routes/miniappRoutes.js";
import { createMiniappDataSource } from "./services/openclawGateway.js";

export const createApp = (overrides = {}) => {
  const mergedConfig = { ...defaultConfig, ...overrides };
  const dataSource =
    overrides.dataSource ||
    createMiniappDataSource({
      openclawGatewayUrl: mergedConfig.openclawGatewayUrl,
      openclawGatewayToken: mergedConfig.openclawGatewayToken,
      requestTimeoutMs: mergedConfig.requestTimeoutMs
    });

  const app = express();
  app.use(express.json());
  app.use(requestContext);
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/miniapp", createMiniappRouter({ config: mergedConfig, dataSource }));

  const webDistPath = path.resolve(process.cwd(), mergedConfig.webDistPath);
  const indexHtmlPath = path.join(webDistPath, "index.html");
  if (fs.existsSync(indexHtmlPath)) {
    app.use(express.static(webDistPath, { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      return res.sendFile(indexHtmlPath);
    });
  } else {
    app.get("/", (_req, res) => {
      res.json({
        ok: true,
        service: "openclaw-miniapp-server",
        endpoints: {
          health: "/health",
          miniappApi: "/api/miniapp/*"
        }
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info("app.config", {
    port: mergedConfig.port,
    allowInsecureDev: mergedConfig.allowInsecureDev,
    hasGateway: Boolean(mergedConfig.openclawGatewayUrl),
    servesWebDist: fs.existsSync(indexHtmlPath)
  });
  return app;
};
