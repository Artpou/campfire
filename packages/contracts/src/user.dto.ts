import { z } from "zod";

import { mediaTypeEnum, userRoleEnum } from "./enums";

export const listUsersDto = z.object({
  q: z.string().max(128).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersDto>;

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
  letterboxdUsername: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/, "Invalid Letterboxd username")
    .nullable()
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileDto>;

export const changePasswordDto = z.object({
  oldPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordDto>;

export const userStatsDto = z.object({
  movies: z.object({
    allTime: z.number().int(),
    thisYear: z.number().int(),
  }),
  tv: z.object({
    allTime: z.number().int(),
    thisYear: z.number().int(),
  }),
  topRated: z.array(
    z.object({
      id: z.number().int(),
      type: z.enum(mediaTypeEnum),
      title: z.string(),
      poster_path: z.string().nullable(),
      score: z.number(),
    }),
  ),
});
export type UserStats = z.infer<typeof userStatsDto>;
