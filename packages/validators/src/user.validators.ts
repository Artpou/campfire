import { type Static, Type } from "@sinclair/typebox";

// User role enum
export const userRoleSchema = Type.Union([
  Type.Literal("owner"),
  Type.Literal("admin"),
  Type.Literal("member"),
  Type.Literal("viewer"),
]);

// Create user schema
export const createUserSchema = Type.Object({
  username: Type.String({ minLength: 3 }),
  password: Type.String({ minLength: 8 }),
  role: userRoleSchema,
});

// Update user schema (all fields optional)
export const updateUserSchema = Type.Object({
  username: Type.Optional(Type.String({ minLength: 3 })),
  password: Type.Optional(Type.String({ minLength: 8 })),
  role: Type.Optional(userRoleSchema),
});

// User output schema
export const userOutputSchema = Type.Object({
  id: Type.String(),
  username: Type.String(),
  role: userRoleSchema,
  createdAt: Type.Any(), // Date type
});

// Export types
export type UserRole = Static<typeof userRoleSchema>;
export type CreateUser = Static<typeof createUserSchema>;
export type UpdateUser = Static<typeof updateUserSchema>;
export type UserOutput = Static<typeof userOutputSchema>;
