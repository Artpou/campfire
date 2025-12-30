import type { App } from "@basement/api";
import { treaty } from "@elysiajs/eden";

export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return import.meta.env.VITE_API_URL || "http://localhost:3002";
  }
  return process.env.INTERNAL_API_URL || "http://localhost:3002";
};

// Client-side API with credentials
// @ts-expect-error - Elysia types are not compatible with the latest version
export const api = treaty<App>(getBaseUrl(), {
  fetch: {
    credentials: "include",
  },
});

// @ts-expect-error - data is not a property of the Awaited type
export type ApiData<T> = NonNullable<Awaited<T>["data"]>;

// @ts-expect-error - data is not a property of the Awaited type
export type ApiDataItem<T> = NonNullable<Awaited<T>["data"]>[number];
