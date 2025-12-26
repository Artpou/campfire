import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL is not set");
}

// Create better-auth React client with username plugin
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [usernameClient()],
});
