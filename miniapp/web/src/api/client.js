import { getTelegramInitData } from "../lib/telegram";
import { clientLogger } from "../lib/logger";

const jsonFetch = async (path, options = {}) => {
  const initData = getTelegramInitData();
  const method = options.method || "GET";
  const startedAt = Date.now();
  clientLogger.info("api.request", { method, path, hasInitData: Boolean(initData) });
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(initData ? { "x-telegram-init-data": initData } : {}),
      ...(options.headers || {})
    }
  });
  const durationMs = Date.now() - startedAt;
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error || `Request failed with ${response.status}`;
    clientLogger.error("api.response.error", {
      method,
      path,
      status: response.status,
      requestId: payload.requestId,
      durationMs,
      message
    });
    throw new Error(payload.requestId ? `${message} (requestId: ${payload.requestId})` : message);
  }
  clientLogger.info("api.response.ok", {
    method,
    path,
    status: response.status,
    durationMs
  });
  return response.json();
};

export const api = {
  bootstrap: () => jsonFetch("/api/miniapp/bootstrap"),
  overview: () => jsonFetch("/api/miniapp/overview"),
  sessions: () => jsonFetch("/api/miniapp/sessions"),
  ai: () => jsonFetch("/api/miniapp/ai"),
  skills: () => jsonFetch("/api/miniapp/skills"),
  skill: (id) => jsonFetch(`/api/miniapp/skills/${encodeURIComponent(id)}`),
  skillAction: (id, action) => jsonFetch(`/api/miniapp/skills/${encodeURIComponent(id)}/${action}`, { method: "POST" }),
  approvals: () => jsonFetch("/api/miniapp/approvals"),
  subagents: () => jsonFetch("/api/miniapp/subagents"),
  subagentAction: (id, action, message = "") => jsonFetch(`/api/miniapp/subagents/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: JSON.stringify({ message })
  }),
  approve: (id) => jsonFetch(`/api/miniapp/approvals/${id}/approve`, { method: "POST" }),
  reject: (id) => jsonFetch(`/api/miniapp/approvals/${id}/reject`, { method: "POST" }),
  logs: (cursor = "0") => jsonFetch(`/api/miniapp/logs?cursor=${encodeURIComponent(cursor)}`)
};
