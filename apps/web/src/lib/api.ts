import type { AppType } from "@basement/api";
import { hc } from "hono/client";

export const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "http://localhost:3002";
  }
  return "";
};

// Client-side API with credentials using Hono RPC
export const api = hc<AppType>(getBaseUrl(), {
  init: {
    credentials: "include",
  },
});

// Type helpers for Hono RPC
export type ApiResponse<T> = T extends Promise<infer R> ? R : T;
export type ApiData<T> = ApiResponse<T> extends { json: () => Promise<infer R> } ? R : never;
export type ApiDataItem<T> = ApiData<T> extends (infer U)[] ? U : never;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Unwrap API response and handle errors
 * Throws an ApiError if the response is not ok, otherwise returns the JSON data.
 * Attempts to parse the standard `{ error: string }` shape from the backend
 * so callers can show a meaningful message.
 */
export async function unwrap<T>(
  response: Promise<{ ok: boolean; json: () => Promise<T> } | Response>,
): Promise<T> {
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
