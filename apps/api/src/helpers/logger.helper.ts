// ANSI color codes
export const colors = {
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

/**
 * Color codes HTTP method based on type
 */
const colorMethod = (method: string): string => {
  const upperMethod = method.toUpperCase();

  if (upperMethod === "GET") {
    return `${colors.green}${method}${colors.reset}`;
  }
  if (upperMethod === "OPTIONS") {
    return `${colors.blue}${method}${colors.reset}`;
  }
  return `${colors.yellow}${method}${colors.reset}`;
};

/**
 * Color codes status code based on range
 */
const colorStatus = (status: number): string => {
  const statusStr = status.toString();

  if (status >= 100 && status < 300) {
    return `${colors.green}${statusStr}${colors.reset}`;
  }
  if (status >= 300 && status < 400) {
    return `${colors.blue}${statusStr}${colors.reset}`;
  }
  if (status >= 400 && status < 500) {
    return `${colors.orange}${statusStr}${colors.reset}`;
  }
  if (status >= 500) {
    return `${colors.red}${statusStr}${colors.reset}`;
  }

  return statusStr;
};

/**
 * Format duration with appropriate unit
 */
const formatDuration = (ms: number): string => {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Format timestamp as HH:MM:SS
 */
const formatTimestamp = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Logs HTTP request with timing, colored method, route, and colored status code
 */
export const logRequest = (
  method: string,
  url: string,
  status: number | string,
  durationMs: number,
  params: Record<string, string>,
) => {
  const timestamp = `${colors.gray}${formatTimestamp()}${colors.reset}`;
  const duration = `${colors.gray} ${formatDuration(durationMs)}${colors.reset}`;
  const coloredMethod = colorMethod(method);
  const statusCode = typeof status === "string" ? parseInt(status, 10) : status;
  const coloredStatus = colorStatus(statusCode);

  const formatedParams = Object.entries(params || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const route = new URL(url).pathname + (formatedParams ? `?${formatedParams}` : "");

  console.log(`${timestamp} ${coloredMethod} ${route} ${coloredStatus} ${duration}`);
};
