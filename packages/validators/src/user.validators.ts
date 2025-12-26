import { type Static, Type } from "@sinclair/typebox";

// User ID schema (for queries)
export const userIdSchema = Type.String();

// User output schema (for responses)
export const userOutputSchema = Type.Object({
  id: Type.String(),
  email: Type.String({ format: "email" }),
  emailVerified: Type.Boolean(),
  name: Type.Union([Type.String(), Type.Null()]),
  image: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.Any(), // Date type
  updatedAt: Type.Any(), // Date type
});

// User input schema (for create mutations - if needed later)
// Note: Password matching validation moved to UI layer
export const userInputSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({
    minLength: 8,
    description: "Password must be at least 8 characters.",
  }),
  confirmPassword: Type.String({
    minLength: 8,
    description: "Password confirmation must be at least 8 characters.",
  }),
});

// Export types
export type UserId = Static<typeof userIdSchema>;
export type UserOutput = Static<typeof userOutputSchema>;
export type UserInput = Static<typeof userInputSchema>;
