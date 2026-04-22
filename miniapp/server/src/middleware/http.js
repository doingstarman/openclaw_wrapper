import crypto from "node:crypto";
import { logger } from "../logger.js";

export const requestContext = (req, res, next) => {
  const requestId = req.header("x-request-id") || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  logger.info("request.start", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl
  });
  res.on("finish", () => {
    logger.info("request.finish", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start
    });
  });
  next();
};

export const notFoundHandler = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  const status = Number(err?.status || err?.statusCode || 500);
  logger.error("request.error", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    error: err?.message,
    stack: err?.stack
  });
  res.status(status).json({
    error: err?.message || "Internal Server Error",
    requestId: req.requestId
  });
};

export const asyncRoute = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

