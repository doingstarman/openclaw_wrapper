import { mockAi, mockLogs, mockOverview, mockSessions, seedApprovals } from "../data/mockData.js";
import { logger } from "../logger.js";

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

export const createMiniappDataSource = ({ openclawGatewayUrl, openclawGatewayToken, requestTimeoutMs }) => {
  const approvals = seedApprovals();
  const logs = [...mockLogs];

  const fetchGateway = async (path) => {
    if (!openclawGatewayUrl) {
      return null;
    }
    const base = openclawGatewayUrl.replace(/\/+$/, "");
    const response = await withTimeout(
      fetch(`${base}${path}`, {
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

  const safeGatewayRead = async (path, fallback) => {
    try {
      const payload = await fetchGateway(path);
      return payload || fallback;
    } catch (error) {
      logger.warn("gateway.fallback", {
        path,
        reason: error.message
      });
      return fallback;
    }
  };

  const getLogsPage = (cursor, limit = 5) => {
    const offset = Number(cursor || 0);
    const bounded = Number.isNaN(offset) ? 0 : Math.max(0, offset);
    const items = logs.slice(bounded, bounded + limit);
    const next = bounded + items.length;
    return {
      items,
      nextCursor: String(next),
      hasMore: next < logs.length
    };
  };

  return {
    getBootstrap: async () =>
      safeGatewayRead("/api/miniapp/bootstrap", {
        status: "ok"
      }),
    getOverview: async () => safeGatewayRead("/api/miniapp/overview", mockOverview),
    getSessions: async () => safeGatewayRead("/api/miniapp/sessions", mockSessions),
    getAi: async () => safeGatewayRead("/api/miniapp/ai", mockAi),
    getApprovals: async () => safeGatewayRead("/api/miniapp/approvals", approvals),
    approve: async (approvalId, action, actorId) => {
      const item = approvals.find((a) => a.id === approvalId);
      if (!item) {
        return null;
      }
      item.state = action === "approve" ? "approved" : "rejected";
      logs.unshift(
        `[${new Date().toISOString()}] approval.${approvalId} ${item.state} by ${actorId}`
      );
      return item;
    },
    getLogs: async (cursor) => safeGatewayRead(`/api/miniapp/logs?cursor=${cursor || 0}`, getLogsPage(cursor))
  };
};
