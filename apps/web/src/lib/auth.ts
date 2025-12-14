import { createAuthClient } from "better-auth/react";

const apiUrl = import.meta.env.VITE_API_URL;

if (!import.meta.env.VITE_API_URL) {
  throw new Error("VITE_API_URL is not set");
}

const _authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: apiUrl,
  fetchOptions: {
    credentials: "include",
  },
});

export const authClient: ReturnType<typeof createAuthClient> = _authClient;

export const signIn: typeof _authClient.signIn = _authClient.signIn;
export const signUp: typeof _authClient.signUp = _authClient.signUp;
export const signOut: typeof _authClient.signOut = _authClient.signOut;
export const useSession: typeof _authClient.useSession = _authClient.useSession;
