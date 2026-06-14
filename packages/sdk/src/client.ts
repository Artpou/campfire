import type { AppType } from "@seedarr/api";
import { hc } from "hono/client";

export const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || "http://localhost:3002";
  }
  return "";
};

export function withSessionParam(url: string, session?: string): string {
  if (!session) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}session=${encodeURIComponent(session)}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `API Error: ${res.status}`;
    try {
      const body = (await res.clone().json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {}
    throw new ApiError(message, res.status);
  }
  return res;
}

export const api = hc<AppType>(getBaseUrl(), {
  init: { credentials: "include" },
  fetch: apiFetch,
});

/**
 * Extract JSON data from a Hono client response.
 * Since `api` already throws on non-ok responses, this only
 * needs to parse the JSON body. Kept for backward compatibility
 * with query hooks that need typed return values.
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
    } catch {}
    throw new ApiError(message, typeof status === "number" ? status : 0);
  }
  return res.json() as Promise<T>;
}
