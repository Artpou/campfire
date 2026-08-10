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

export const updateProfileDto = z.object({
  pseudo: z.string().trim().min(1).max(64).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileDto>;

export const changePasswordDto = z.object({
  oldPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordDto>;
