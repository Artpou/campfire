import ms from "ms";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DURATION_MS = ms("7d");
export const SESSION_ROTATION_AGE_MS = ms("24h");

const isProduction = process.env.NODE_ENV === "production";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  path: "/",
  sameSite: "lax" as const,
};
