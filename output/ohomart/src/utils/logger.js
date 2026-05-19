// Thin logger — only outputs in development; silent in production.
// Use instead of raw console.log/error/warn throughout the app.
const isDev = process.env.NODE_ENV === "development";

const logger = {
  error: (...args) => { if (isDev) console.error(...args); },
  warn:  (...args) => { if (isDev) console.warn(...args); },
  info:  (...args) => { if (isDev) console.info(...args); },
};

export default logger;
