import { describe, expect, it } from "vitest";
import { buildTelegramSignature, validateTelegramInitData } from "../../src/security/telegramInitData.js";

const BOT_TOKEN = "123456:ABCDEF";

const makeInitData = ({ user, authDate, botToken = BOT_TOKEN }) => {
  const payload = new URLSearchParams();
  payload.set("auth_date", String(authDate));
  payload.set("query_id", "AAEAAAE");
  payload.set("user", JSON.stringify(user));

  const entries = [...payload.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const hash = buildTelegramSignature({ botToken, dataCheckString });
  payload.set("hash", hash);
  return payload.toString();
};

describe("validateTelegramInitData", () => {
  it("accepts a valid payload", () => {
    const now = 1_710_000_000;
    const initDataRaw = makeInitData({
      authDate: now - 15,
      user: { id: 42, username: "user42" }
    });

    const result = validateTelegramInitData({
      initDataRaw,
      botToken: BOT_TOKEN,
      nowUnix: now,
      maxAgeSeconds: 60
    });

    expect(result.user.id).toBe(42);
  });

  it("rejects invalid hash", () => {
    const now = 1_710_000_000;
    const payload = new URLSearchParams(
      makeInitData({
        authDate: now,
        user: { id: 7 }
      })
    );
    payload.set("hash", "deadbeef");

    expect(() =>
      validateTelegramInitData({
        initDataRaw: payload.toString(),
        botToken: BOT_TOKEN,
        nowUnix: now
      })
    ).toThrow("signature mismatch");
  });
});

