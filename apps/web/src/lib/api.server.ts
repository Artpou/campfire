import type { App } from "@basement/api";
import { treaty } from "@elysiajs/eden";
import { getRequest } from "@tanstack/react-start/server";

/**
 * À utiliser UNIQUEMENT dans createServerFn ou le côté serveur d'un loader.
 * Injecte automatiquement les cookies de l'utilisateur dans l'appel API.
 */
export const getApiServer = () => {
  const request = getRequest();
  const cookie = request?.headers.get("cookie") || "";

  // On utilise l'URL interne (souvent différente en Docker/Prod)
  const baseUrl = process.env.INTERNAL_API_URL || "http://localhost:3002";

  return treaty<App>(baseUrl, {
    headers: {
      cookie,
    },
  });
};
