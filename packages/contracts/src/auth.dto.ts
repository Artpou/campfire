import { z } from "zod";

export const loginDto = z.object({
  username: z.string().max(64),
  password: z.string().max(128),
});
export type LoginInput = z.infer<typeof loginDto>;

export const registerDto = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
});
export type RegisterInput = z.infer<typeof registerDto>;
