import { z } from "zod";

import { userRoleEnum } from "./enums";

export const createUserDto = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
  role: z.enum(userRoleEnum),
});
export type CreateUserInput = z.infer<typeof createUserDto>;

export const updateUserDto = z.object({
  username: z.string().min(3).max(64).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(userRoleEnum).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserDto>;
