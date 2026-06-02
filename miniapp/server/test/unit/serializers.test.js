import { describe, expect, it } from "vitest";
import { serializeApprovals, serializeLogsPage, serializeOverview } from "../../src/serializers/miniappSerializers.js";

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
});
