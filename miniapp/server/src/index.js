import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();
app.listen(config.port, () => {
  logger.info("server.started", {
    url: `http://localhost:${config.port}`
  });
});

process.on("unhandledRejection", (reason) => {
  logger.error("process.unhandledRejection", {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
});

process.on("uncaughtException", (error) => {
  logger.error("process.uncaughtException", {
    error: error.message,
    stack: error.stack
  });
});
