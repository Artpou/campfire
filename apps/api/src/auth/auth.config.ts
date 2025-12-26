import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, username } from "better-auth/plugins";
import { db } from "../db/db";
import * as schema from "../db/schema";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const apiUrl = process.env.API_URL;
const webUrl = process.env.WEB_URL;

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

if (!apiUrl) {
  throw new Error("API_URL environment variable is required");
}

export const auth = betterAuth({
  plugins: [
    openAPI(),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 20,
    }),
  ],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret: betterAuthSecret,
  baseURL: apiUrl,
  basePath: "/api/auth",
  trustedOrigins: [webUrl, apiUrl].filter(Boolean) as string[],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
