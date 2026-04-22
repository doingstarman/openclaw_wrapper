const toMessage = (value) => {
  if (value instanceof Error) {
    return value.message;
  }
  return String(value);
};

export const logger = {
  info(message, fields = {}) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: "info",
        time: new Date().toISOString(),
        msg: toMessage(message),
        ...fields
      })
    );
  },
  warn(message, fields = {}) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: "warn",
        time: new Date().toISOString(),
        msg: toMessage(message),
        ...fields
      })
    );
  },
  error(message, fields = {}) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        time: new Date().toISOString(),
        msg: toMessage(message),
        ...fields
      })
    );
  }
};

