const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  orange: "\x1b[38;5;208m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function getLogLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || "info").toLowerCase();
  return env in LOG_LEVELS ? (env as LogLevel) : "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getLogLevel()];
}

export const logger = {
  debug: (tag: string, message: string, ...args: unknown[]) => {
    if (shouldLog("debug")) console.debug(`${colors.gray}[${tag}]${colors.reset} ${message}`, ...args);
  },
  info: (tag: string, message: string, ...args: unknown[]) => {
    if (shouldLog("info")) console.info(`${colors.blue}[${tag}]${colors.reset} ${message}`, ...args);
  },
  warn: (tag: string, message: string, ...args: unknown[]) => {
    if (shouldLog("warn")) console.warn(`${colors.yellow}[${tag}]${colors.reset} ${message}`, ...args);
  },
  error: (tag: string, message: string, ...args: unknown[]) => {
    if (shouldLog("error")) console.error(`${colors.red}[${tag}]${colors.reset} ${message}`, ...args);
  },
};

const colorMethod = (method: string): string => {
  const upper = method.toUpperCase();
  if (upper === "GET") return `${colors.green}${method}${colors.reset}`;
  if (upper === "OPTIONS") return `${colors.blue}${method}${colors.reset}`;
  return `${colors.yellow}${method}${colors.reset}`;
};

const colorStatus = (status: number): string => {
  const s = status.toString();
  if (status >= 500) return `${colors.red}${s}${colors.reset}`;
  if (status >= 400) return `${colors.orange}${s}${colors.reset}`;
  if (status >= 300) return `${colors.blue}${s}${colors.reset}`;
  if (status >= 100) return `${colors.green}${s}${colors.reset}`;
  return s;
};

const formatDuration = (ms: number): string => {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatTimestamp = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
};

export const logRequest = (
  method: string,
  url: string,
  status: number | string,
  durationMs: number,
  params: Record<string, string>,
) => {
  if (!shouldLog("info")) return;

  const timestamp = `${colors.gray}${formatTimestamp()}${colors.reset}`;
  const duration = `${colors.gray} ${formatDuration(durationMs)}${colors.reset}`;
  const statusCode = typeof status === "string" ? Number.parseInt(status, 10) : status;

  const formatedParams = Object.entries(params || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const route = new URL(url).pathname + (formatedParams ? `?${formatedParams}` : "");

  console.log(`${timestamp} ${colorMethod(method)} ${route} ${colorStatus(statusCode)} ${duration}`);
};

export const startupLogger = (startTime: number, port: number) => {
  console.log(`[STARTUP] Server is now listening`);
  console.log(
    `\n  ${colors.bold}${colors.yellow}HONO${colors.reset} ${colors.yellow}v4${colors.reset}  ready in ${Date.now() - startTime} ms\n`,
  );
  console.log(
    `  ${colors.bold}${colors.yellow}>${colors.reset}  ${colors.bold}Local:${colors.reset}   ${colors.cyan}http://localhost:${colors.bold}${port}${colors.reset}${colors.cyan}/${colors.reset}`,
  );
  console.log(`  ${colors.bold}Log level:${colors.reset} ${getLogLevel()}\n`);
};
