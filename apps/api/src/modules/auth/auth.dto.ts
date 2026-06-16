import { z } from "zod";

import { User } from "@/types";

export const registerDto = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

export const loginDto = z.object({
  username: z.string(),
  password: z.string(),
});

export type AuthUser = User & { countIndexerManagers: number };
