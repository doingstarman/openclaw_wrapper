const toSet = (value) =>
  new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

export const config = {
  port: Number(process.env.PORT || 3722),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  maxInitDataAgeSeconds: Number(process.env.TG_INITDATA_MAX_AGE_SECONDS || 300),
  allowInsecureDev:
    process.env.MINIAPP_ALLOW_INSECURE_DEV === "true" ||
    (process.env.MINIAPP_ALLOW_INSECURE_DEV !== "false" &&
      process.env.NODE_ENV !== "production"),
  allowedUserIds: toSet(process.env.TELEGRAM_ALLOWED_USER_IDS),
  adminUserIds: toSet(process.env.TELEGRAM_ADMIN_USER_IDS),
  openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || "",
  openclawGatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || "",
  requestTimeoutMs: Number(process.env.OPENCLAW_REQUEST_TIMEOUT_MS || 2500),
  webDistPath: process.env.WEB_DIST_PATH || "../web/dist"
};
