import crypto from "node:crypto";

const safeCompareHex = (a, b) => {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
};

const parseInitData = (initDataRaw) => {
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("Missing hash in initData");
  }

  const entries = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") {
      continue;
    }
    entries.push([key, value]);
  }
  entries.sort(([a], [b]) => a.localeCompare(b));

  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  return { hash, dataCheckString, params };
};

export const buildTelegramSignature = ({ botToken, dataCheckString }) => {
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  return crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
};

export const validateTelegramInitData = ({
  initDataRaw,
  botToken,
  nowUnix = Math.floor(Date.now() / 1000),
  maxAgeSeconds = 300
}) => {
  if (!initDataRaw) {
    throw new Error("Missing Telegram initData");
  }
  if (!botToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN for initData validation");
  }

  const { hash, dataCheckString, params } = parseInitData(initDataRaw);
  const expectedHash = buildTelegramSignature({ botToken, dataCheckString });
  if (!safeCompareHex(hash, expectedHash)) {
    throw new Error("Telegram initData signature mismatch");
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate) {
    throw new Error("Missing auth_date in initData");
  }

  if (authDate + maxAgeSeconds < nowUnix) {
    throw new Error("Telegram initData expired");
  }

  const rawUser = params.get("user");
  if (!rawUser) {
    throw new Error("Missing user in initData");
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch {
    throw new Error("Invalid user payload in initData");
  }

  const userId = String(user.id || "");
  if (!userId) {
    throw new Error("Telegram user id is missing");
  }

  return {
    user,
    authDate
  };
};

