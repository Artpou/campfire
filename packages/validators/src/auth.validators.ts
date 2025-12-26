import { type Static, Type } from "@sinclair/typebox";

// Sign in schema
export const signInSchema = Type.Object({
  username: Type.String({
    minLength: 3,
    maxLength: 20,
    pattern: "^[a-zA-Z0-9_]+$",
    description: "Username can only contain letters, numbers, and underscores.",
  }),
  password: Type.String({
    minLength: 1,
    description: "Password is required.",
  }),
});

// Sign up schema (without password matching - will be handled in UI)
export const signUpSchema = Type.Object({
  username: Type.String({
    minLength: 3,
    maxLength: 20,
    pattern: "^[a-zA-Z0-9_]+$",
    description: "Username can only contain letters, numbers, and underscores.",
  }),
  password: Type.String({
    minLength: 8,
    description: "Password must be at least 8 characters.",
  }),
  confirmPassword: Type.String({
    minLength: 8,
    description: "Password confirmation must be at least 8 characters.",
  }),
});

// Sign out schema (session token)
export const signOutSchema = Type.Object({
  sessionToken: Type.String(),
});

// Session output schema
export const sessionOutputSchema = Type.Object({
  session: Type.Object({
    id: Type.String(),
    userId: Type.String(),
    expiresAt: Type.Any(), // TypeBox doesn't have native Date, use Any or custom format
    token: Type.String(),
    ipAddress: Type.Union([Type.String(), Type.Null()]),
    userAgent: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  }),
  user: Type.Object({
    id: Type.String(),
    email: Type.String({ format: "email" }),
    emailVerified: Type.Boolean(),
    name: Type.Union([Type.String(), Type.Null()]),
    image: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.Any(),
    updatedAt: Type.Any(),
  }),
});

// User output schema (from session)
export const authUserOutputSchema = Type.Object({
  id: Type.String(),
  username: Type.String(),
  image: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.Any(),
  updatedAt: Type.Any(),
});

// Export types
export type SignIn = Static<typeof signInSchema>;
export type SignUp = Static<typeof signUpSchema>;
export type SignOut = Static<typeof signOutSchema>;
export type SessionOutput = Static<typeof sessionOutputSchema>;
export type AuthUserOutput = Static<typeof authUserOutputSchema>;
