import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { user, userRoleEnum } from "@/modules/user/user.schema";

// Database schemas
export const userSelectSchema = createSelectSchema(user);
export const userInsertSchema = createInsertSchema(user);

type UserBase = Omit<z.infer<typeof userSelectSchema>, "password" | "createdAt">;
export type User = UserBase & { createdAt: Date | string };
export type NewUser = z.input<typeof userInsertSchema>;

// Request schemas
export const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  role: z.enum(userRoleEnum),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(userRoleEnum).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
