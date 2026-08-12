/** biome-ignore-all lint/suspicious/noConsole: console is used for logging */
import { formatError } from "@seedarr/shared";

import { appendFileSync, existsSync, renameSync, statSync } from "node:fs";

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

const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024;

function getLogLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || "info").toLowerCase();
  return env in LOG_LEVELS ? (env as LogLevel) : "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getLogLevel()];
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes requires matching control characters
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function writeToFile(line: string) {
  if (process.env.LOG_TO_FILE === "false") return;
  const filePath = process.env.LOG_FILE_PATH || "./seedarr.log";
  try {
    if (existsSync(filePath) && statSync(filePath).size >= MAX_LOG_FILE_SIZE) {
      renameSync(filePath, filePath.replace(/\.log$/, ".old.log"));
    }
    appendFileSync(filePath, `${stripAnsi(line)}\n`);
  } catch (err) {
    console.error(`[LOGGER] Failed to write to log file: ${formatError(err)}`);
  }
}

const formatTimestamp = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
};

const buildLogLine = (level: string, tag: string, message: string, args: unknown[]): string => {
  const ts = formatTimestamp();
  const extra = args.length > 0 ? ` ${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}` : "";
  return `${ts} [${level.toUpperCase()}] [${tag}] ${message}${extra}`;
};

export const logger = {
  debug: (tag: string, message: string, ...args: unknown[]) => {
    if (!shouldLog("debug")) return;
    const line = `${colors.gray}[${tag}]${colors.reset} ${message}`;
    console.debug(line, ...args);
    writeToFile(buildLogLine("debug", tag, message, args));
  },
  info: (tag: string, message: string, ...args: unknown[]) => {
    if (!shouldLog("info")) return;
    const line = `${colors.blue}[${tag}]${colors.reset} ${message}`;
    console.info(line, ...args);
    writeToFile(buildLogLine("info", tag, message, args));
  },
  warn: (tag: string, message: string, ...args: unknown[]) => {
    if (!shouldLog("warn")) return;
    const line = `${colors.yellow}[${tag}]${colors.reset} ${message}`;
    console.warn(line, ...args);
    writeToFile(buildLogLine("warn", tag, message, args));
  },
  error: (tag: string, message: string, ...args: unknown[]) => {
    if (!shouldLog("error")) return;
    const line = `${colors.red}[${tag}]${colors.reset} ${message}`;
    console.error(line, ...args);
    writeToFile(buildLogLine("error", tag, message, args));
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
    .map(([key, value]) => `${key}=${key === "session" || key === "token" ? "[REDACTED]" : value}`)
    .join("&");
  const route = new URL(url).pathname + (formatedParams ? `?${formatedParams}` : "");

  const consoleLine = `${timestamp} ${colorMethod(method)} ${route} ${colorStatus(statusCode)} ${duration}`;
  console.log(consoleLine);
  writeToFile(`${formatTimestamp()} ${method} ${route} ${statusCode} ${formatDuration(durationMs)}`);
};

export const startupLogger = ({
  startTime,
  port,
  downloadsPath,
}: {
  startTime: number;
  port: number;
  downloadsPath: string;
}) => {
  const publicUrl = process.env.WEB_URL?.replace(/\/$/, "") || `http://localhost:${port}`;

  console.log(
    `\n  ${colors.bold}${colors.yellow}HONO${colors.reset} ${colors.yellow}v4${colors.reset}  ready in ${Date.now() - startTime} ms\n`,
  );
  if (process.env.WEB_URL) {
    console.log(
      `  ${colors.bold}${colors.yellow}➜${colors.reset}  ${colors.bold}Listen:${colors.reset}  ${colors.cyan}0.0.0.0:${port}${colors.reset} ${colors.gray}(container)${colors.reset}`,
    );
  }
  console.log(
    `  ${colors.bold}${colors.yellow}➜${colors.reset}  ${colors.bold}App:${colors.reset}     ${colors.cyan}${publicUrl}/${colors.reset}`,
  );

  console.log(`\n  ${colors.bold}Downloads:${colors.reset} ${colors.cyan}${downloadsPath}${colors.reset}`);
  console.log(`  ${colors.bold}Log level:${colors.reset} ${getLogLevel()}\n`);

  writeToFile(`[STARTUP] Server ready in ${Date.now() - startTime}ms on port ${port} (level: ${getLogLevel()})`);
};
