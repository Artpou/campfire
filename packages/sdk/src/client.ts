import type { AppType } from "@seedarr/api";
import { hc } from "hono/client";

export const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || "http://localhost:3002";
  }
  return "";
};

export const api = hc<AppType>(getBaseUrl(), {
  init: {
    credentials: "include",
  },
});

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Unwrap API response and handle errors.
 * Throws an ApiError if the response is not ok, otherwise returns the JSON data.
 * Parses the standard `{ error: string }` shape from the backend
 * so callers can show a meaningful message.
 */
export async function unwrap<T>(response: Promise<{ ok: boolean; json: () => Promise<T> } | Response>): Promise<T> {
  const res = await response;
  if (!res.ok) {
    const status = "status" in res ? res.status : 0;
    let message = `API Error: ${status}`;
    try {
      const body = (await (res as Response).json()) as { error?: string };
      if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // body wasn't JSON; fall back to status-based message
    }
    throw new ApiError(message, typeof status === "number" ? status : 0);
  }
  return res.json() as Promise<T>;
}
