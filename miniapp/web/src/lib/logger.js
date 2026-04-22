export const clientLogger = {
  info(message, fields = {}) {
    // eslint-disable-next-line no-console
    console.log("[miniapp:web]", message, fields);
  },
  warn(message, fields = {}) {
    // eslint-disable-next-line no-console
    console.warn("[miniapp:web]", message, fields);
  },
  error(message, fields = {}) {
    // eslint-disable-next-line no-console
    console.error("[miniapp:web]", message, fields);
  }
};

