const getWebApp = () => window?.Telegram?.WebApp;

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
};

export const getTelegramInitData = () => getWebApp()?.initData || "";

export const getTelegramUserLabel = () => {
  const user = getWebApp()?.initDataUnsafe?.user;
  if (!user) {
    return "Пользователь не определен";
  }
  return user.username ? `@${user.username}` : String(user.id || "Пользователь не определен");
};
