import { describe, expect, it } from "vitest";
import {
  serializeAgentAudit,
  serializeAgentDetail,
  serializeAgents,
  serializeApprovals,
  serializeLogsPage,
  serializeOverview
} from "../../src/serializers/miniappSerializers.js";

describe("miniapp serializers", () => {
  it("serializes overview with expected fields", () => {
    const result = serializeOverview({
      status: "online",
      workload: "2 active",
      health: "stable",
      currentBot: "test",
      instance: "dev",
      latestCron: "none",
      nearestCron: "none",
      primaryModel: "gpt",
      currentEvent: { title: "event" },
      operational: { lastSession: "session" },
      securityAlerts: [{ id: "a" }],
      skills: [{ id: "skill" }],
      cronJobs: [{ id: "cron" }]
    });
    expect(result).toEqual({
      status: "online",
      workload: "2 active",
      health: "stable",
      currentBot: "test",
      instance: "dev",
      latestCron: "none",
      nearestCron: "none",
      primaryModel: "gpt",
      currentEvent: { title: "event" },
      operational: { lastSession: "session" },
      securityAlerts: [{ id: "a" }],
      skills: [{ id: "skill" }],
      cronJobs: [{ id: "cron" }]
    });
  });

  it("serializes approvals and logs page", () => {
    const approvals = serializeApprovals([
      { id: "a1", title: "run", risk: "HIGH", meta: "cmd", state: "pending", extra: true }
    ]);
    expect(approvals[0]).toEqual({
      id: "a1",
      title: "run",
      risk: "HIGH",
      meta: "cmd",
      state: "pending"
    });

    const page = serializeLogsPage({ items: ["x"], nextCursor: "1", hasMore: true });
    expect(page).toEqual({ items: ["x"], nextCursor: "1", hasMore: true });
  });

  it("serializes agent control plane fields", () => {
    const agent = {
      id: "a1",
      name: "Agent",
      type: "webhook",
      status: "healthy",
      enabled: true,
      capabilities: ["sync"],
      endpoints: { health: "/health" },
      auth: { type: "hmac", secretRef: "AGENT_SECRET" },
      ownerUserIds: ["42"],
      environment: "prod",
      tags: ["prod"],
      health: { ok: true },
      commandSchema: { actions: [{ id: "sync_now", danger: "safe", params: [] }] },
      tasks: { active: [], recent: [] },
      logs: [{ message: "ok" }]
    };

    expect(serializeAgents([agent], "42")[0]).toMatchObject({
      id: "a1",
      ownedByCurrentUser: true,
      commands: { actions: [{ id: "sync_now", danger: "safe", params: [] }] }
    });
    expect(serializeAgentDetail(agent, "7").ownedByCurrentUser).toBe(false);
    expect(serializeAgentAudit([{ id: "e1", agentId: "a1", action: "sync_now" }])[0]).toMatchObject({
      id: "e1",
      agentId: "a1",
      action: "sync_now"
    });
  });
});
