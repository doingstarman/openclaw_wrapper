const getWebApp = () => window?.Telegram?.WebApp;

let cachedInitData = "";

const readInitDataFromUrl = () => {
  const candidates = [window.location.hash?.replace(/^#/, ""), window.location.search?.replace(/^\?/, "")].filter(Boolean);
  for (const candidate of candidates) {
    const params = new URLSearchParams(candidate);
    const direct = params.get("tgWebAppData") || params.get("initData");
    if (direct) return direct;
  }
  return "";
};

const readInitData = () => {
  const value = getWebApp()?.initData || readInitDataFromUrl() || cachedInitData || sessionStorage.getItem("telegramInitData") || "";
  if (value) {
    cachedInitData = value;
    sessionStorage.setItem("telegramInitData", value);
  }
  return value;
};

export const initTelegram = async () => {
  const webApp = getWebApp();
  if (webApp) {
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor?.("#000000");
    webApp.setBackgroundColor?.("#000000");
  }

  // Keep dependency in stack; use dynamic import to avoid hard runtime coupling.
  try {
    const sdk = await import("@telegram-apps/sdk");
    if (typeof sdk?.postEvent === "function") {
      // No-op event to ensure SDK package is loaded in runtime.
      sdk.postEvent("web_app_request_theme");
    }
  } catch {
    // Fallback to native Telegram WebApp object only.
  }

  // Telegram WebView can populate initData a tick after the WebApp script is available.
  if (!readInitData()) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    readInitData();
  }
};

export const getTelegramInitData = () => readInitData();

export const getTelegramUserLabel = () => {
  const user = getWebApp()?.initDataUnsafe?.user;
  if (!user) {
    try {
      const raw = readInitData();
      const parsedUser = raw ? JSON.parse(new URLSearchParams(raw).get("user") || "null") : null;
      if (parsedUser?.username) return `@${parsedUser.username}`;
      if (parsedUser?.id) return String(parsedUser.id);
    } catch {
      // Keep generic fallback below.
    }
    return "Пользователь не определен";
  }
  return user.username ? `@${user.username}` : String(user.id || "Пользователь не определен");
};
