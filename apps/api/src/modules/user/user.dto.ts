import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { user, userRoleEnum } from "@/modules/user/user.schema";

// Database schemas
export const userSelectSchema = createSelectSchema(user);
export const userInsertSchema = createInsertSchema(user);

type UserBase = Omit<z.infer<typeof userSelectSchema>, "password">;
export type User = UserBase;
export type NewUser = z.input<typeof userInsertSchema>;

// Request schemas
export const createUserSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
  role: z.enum(userRoleEnum),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  username: z.string().min(3).max(64).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(userRoleEnum).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
