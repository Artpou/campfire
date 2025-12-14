import type { App } from "@basement/api";
import { edenTreaty } from "@elysiajs/eden";

export const api = edenTreaty<App>(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");
