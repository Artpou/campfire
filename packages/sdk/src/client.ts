/// <reference path="./env.d.ts" />

import type { AppType } from "@seedarr/api";
import { type ApplyGlobalResponse, type ClientResponse, hc, parseResponse } from "hono/client";

export const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || "http://localhost:3002";
  }
  return "";
};

export function withMediaTokenParam(url: string, token?: string): string {
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type GlobalErrorResponse = {
  401: { json: { error: string } };
  403: { json: { error: string } };
  404: { json: { error: string } };
  500: { json: { error: string } };
};

export type AppRpcType = ApplyGlobalResponse<AppType, GlobalErrorResponse>;

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

export type ApiClient = ReturnType<typeof hc<AppType>>;

export const createApiClient = (...args: Parameters<typeof hc>): ApiClient => hc<AppType>(...args);

export const api: ApiClient = createApiClient(getBaseUrl(), {
  init: { credentials: "include" },
  fetch: apiFetch,
});

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    const status = "status" in error && typeof error.status === "number" ? error.status : 0;
    return new ApiError(error.message, status);
  }
  return new ApiError("API Error", 0);
}

/**
 * Parse a Hono client response with type safety.
 * Uses `parseResponse()` from hono/client; errors are normalized to `ApiError`.
 * Global error shapes (401/403/404/500) are available via `AppRpcType` for manual handling.
 */
export async function unwrap<R>(response: ClientResponse<R> | Promise<ClientResponse<R>>): Promise<R> {
  try {
    return (await parseResponse(response)) as R;
  } catch (error) {
    throw toApiError(error);
  }
}
