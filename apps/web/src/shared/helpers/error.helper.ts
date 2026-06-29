import { t } from "@lingui/core/macro";
import { ApiError } from "@seedarr/sdk";
import { isNotFound } from "@tanstack/react-router";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return t`Something went wrong`;
}

export function isRouteNotFound(error: unknown): boolean {
  if (isNotFound(error)) return true;
  return getApiError(error)?.status === 404;
}

function getApiError(error: unknown): ApiError | undefined {
  let current: unknown = error;

  while (current instanceof Error) {
    if (current instanceof ApiError) return current;
    current = "cause" in current ? current.cause : undefined;
  }

  return undefined;
}
