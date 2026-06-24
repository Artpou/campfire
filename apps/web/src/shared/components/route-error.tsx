import { type ErrorComponentProps, Navigate } from "@tanstack/react-router";

import { getErrorMessage, isRouteNotFound } from "@/shared/helpers/error.helper";

export function RouteErrorHandler({ error }: ErrorComponentProps) {
  if (isRouteNotFound(error)) {
    return <Navigate to="/404" replace />;
  }

  return <Navigate to="/error" search={{ message: getErrorMessage(error) }} replace />;
}
