/// <reference path="./env.d.ts" />

import type { AppType } from "@seedarr/api";
import { type ApplyGlobalResponse, type ClientResponse, hc, parseResponse } from "hono/client";
import type { ClientErrorStatusCode, ContentfulStatusCode, ServerErrorStatusCode } from "hono/utils/http-status";

export type { AppType };

export const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || "http://localhost:3002";
  }
  return "";
};

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
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request was canceled", 0);
    }
    if (err instanceof TypeError) {
      throw new ApiError("Network error — server may be unavailable", 0);
    }
    throw new ApiError("Connection failed", 0);
  }

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

export type ApiClient = ReturnType<typeof hc<AppRpcType>>;

export const createApiClient = (...args: Parameters<typeof hc>): ApiClient => hc<AppRpcType>(...args);

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

type SuccessStatusCode = Exclude<ContentfulStatusCode, ClientErrorStatusCode | ServerErrorStatusCode>;

/** Success body from a `ClientResponse` union (excludes typed 4xx/5xx branches). */
type UnwrapResult<T> = T extends ClientResponse<infer R, infer S, infer _F>
  ? S extends SuccessStatusCode
    ? R
    : never
  : never;

/**
 * Parse a Hono client response with type safety.
 * Uses `parseResponse()` from hono/client; errors are normalized to `ApiError`.
 * Global error shapes (401/403/404/500) are available via `AppRpcType` for manual handling.
 *
 * Accepts the full `ClientResponse` union (incl. typed 400 validation failures from
 * `@hono/zod-validator`) and returns only the success body, matching `parseResponse`.
 * Do not pass an explicit type argument — it is the response union, not the JSON body.
 */
export async function unwrap<T extends ClientResponse<unknown>>(response: T | Promise<T>): Promise<UnwrapResult<T>> {
  try {
    return (await parseResponse(response)) as UnwrapResult<T>;
  } catch (error) {
    throw toApiError(error);
  }
}

/** Multipart / raw fetch that still goes through {@link apiFetch} (credentials + ApiError). */
export async function unwrapForm<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${getBaseUrl()}${path}`, {
    credentials: "include",
    ...init,
  });
  return (await res.json()) as T;
}
