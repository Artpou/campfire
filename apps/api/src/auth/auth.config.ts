import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "../db/db";
import * as schema from "../db/schema";

export const trustedOrigins = [process.env.WEB_URL, process.env.API_URL].filter(
  (url): url is string => Boolean(url),
);

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const apiUrl = process.env.API_URL;

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

if (!apiUrl) {
  throw new Error("API_URL environment variable is required");
}

export const auth = betterAuth({
  plugins: [openAPI()],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: betterAuthSecret,
  baseURL: apiUrl,
  basePath: "/api/auth",
  trustedOrigins,
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
