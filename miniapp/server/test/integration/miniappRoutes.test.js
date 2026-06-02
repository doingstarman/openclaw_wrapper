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
});

