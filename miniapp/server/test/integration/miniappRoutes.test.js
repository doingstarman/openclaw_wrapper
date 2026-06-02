import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { buildTelegramSignature } from "../../src/security/telegramInitData.js";

const BOT_TOKEN = "123456:ABCDEF";

const signInitData = ({ user, authDate }) => {
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAEAAAE");
  params.set("user", JSON.stringify(user));
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  params.set("hash", buildTelegramSignature({ botToken: BOT_TOKEN, dataCheckString }));
  return params.toString();
};

describe("miniapp routes", () => {
  it("returns bootstrap for valid init data", async () => {
    const app = createApp({
      telegramBotToken: BOT_TOKEN,
      allowedUserIds: new Set(["42"]),
      adminUserIds: new Set(["42"])
    });
    const initData = signInitData({
      authDate: Math.floor(Date.now() / 1000),
      user: { id: 42, username: "admin" }
    });

    const response = await request(app)
      .get("/api/miniapp/bootstrap")
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(response.body.user.id).toBe(42);
    expect(response.body.permissions.canApprove).toBe(true);
  });

  it("handles approval roundtrip and log pagination", async () => {
    const app = createApp({
      telegramBotToken: BOT_TOKEN,
      allowedUserIds: new Set(["42"]),
      adminUserIds: new Set(["42"])
    });
    const initData = signInitData({
      authDate: Math.floor(Date.now() / 1000),
      user: { id: 42, username: "admin" }
    });

    await request(app)
      .post("/api/miniapp/approvals/exec_request_91/approve")
      .set("x-telegram-init-data", initData)
      .expect(200);

    const approvals = await request(app)
      .get("/api/miniapp/approvals")
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(approvals.body.items.find((a) => a.id === "exec_request_91")?.state).toBe("approved");

    const logs = await request(app)
      .get("/api/miniapp/logs?cursor=0")
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(Array.isArray(logs.body.items)).toBe(true);
    expect(typeof logs.body.nextCursor).toBe("string");
  });

  it("returns skills and handles local skill actions", async () => {
    const app = createApp({
      telegramBotToken: BOT_TOKEN,
      allowedUserIds: new Set(["42"]),
      adminUserIds: new Set(["42"])
    });
    const initData = signInitData({
      authDate: Math.floor(Date.now() / 1000),
      user: { id: 42, username: "admin" }
    });

    const skills = await request(app)
      .get("/api/miniapp/skills")
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(skills.body.items.length).toBeGreaterThan(0);

    const skillId = skills.body.items[0].id;
    const detail = await request(app)
      .get(`/api/miniapp/skills/${skillId}`)
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(detail.body.item.id).toBe(skillId);

    const checked = await request(app)
      .post(`/api/miniapp/skills/${skillId}/check`)
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(checked.body.item.lastRunAt).toBeTruthy();
  });

  it("serves agent registry, capabilities, control confirmations, and audit", async () => {
    const app = createApp({
      telegramBotToken: BOT_TOKEN,
      allowedUserIds: new Set(["42"]),
      adminUserIds: new Set(["42"])
    });
    const initData = signInitData({
      authDate: Math.floor(Date.now() / 1000),
      user: { id: 42, username: "admin" }
    });

    const agents = await request(app)
      .get("/api/miniapp/agents")
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(agents.body.items.length).toBeGreaterThan(0);
    expect(agents.body.items[0]).toHaveProperty("commands.actions");

    const capabilities = await request(app)
      .get("/api/miniapp/agents/calendar-agent/capabilities")
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(capabilities.body.actions.some((action) => action.id === "restart")).toBe(true);

    const needsConfirmation = await request(app)
      .post("/api/miniapp/agents/calendar-agent/control")
      .set("x-telegram-init-data", initData)
      .send({ action: "restart" })
      .expect(409);

    expect(needsConfirmation.body.requiresConfirmation).toBe(true);

    const accepted = await request(app)
      .post("/api/miniapp/agents/calendar-agent/control")
      .set("x-telegram-init-data", initData)
      .send({ action: "restart", confirmed: true })
      .expect(202);

    expect(accepted.body.accepted).toBe(true);
    expect(accepted.body.jobId).toContain("calendar-agent");

    const audit = await request(app)
      .get("/api/miniapp/agent-audit?agentId=calendar-agent")
      .set("x-telegram-init-data", initData)
      .expect(200);

    expect(audit.body.items[0]).toMatchObject({
      agentId: "calendar-agent",
      action: "restart",
      outcome: "accepted"
    });
  });

  it("blocks destructive and external agent actions for non-owners", async () => {
    const app = createApp({
      telegramBotToken: BOT_TOKEN,
      allowedUserIds: new Set(["7"]),
      adminUserIds: new Set(["7"])
    });
    const initData = signInitData({
      authDate: Math.floor(Date.now() / 1000),
      user: { id: 7, username: "admin-not-owner" }
    });

    await request(app)
      .post("/api/miniapp/agents/calendar-agent/control")
      .set("x-telegram-init-data", initData)
      .send({ action: "reset_cursor", params: { source: "calendar" }, confirmed: true })
      .expect(403);
  });
});
