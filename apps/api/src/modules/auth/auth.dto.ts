import { z } from "zod";

import { User } from "@/types";

export const registerDto = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
});

export const loginDto = z.object({
  username: z.string().max(64),
  password: z.string().max(128),
});

export type AuthUser = User & { countIndexerManagers: number };
