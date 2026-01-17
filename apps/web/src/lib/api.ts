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

/**
 * Unwrap API response and handle errors
 * Throws an error if the response is not ok, otherwise returns the JSON data
 */
export async function unwrap<T>(
  response: Promise<{ ok: boolean; json: () => Promise<T> } | Response>,
): Promise<T> {
  const res = await response;
  if (!res.ok) {
    const status = "status" in res ? res.status : "unknown";
    throw new Error(`API Error: ${status}`);
  }
  return res.json() as Promise<T>;
}
