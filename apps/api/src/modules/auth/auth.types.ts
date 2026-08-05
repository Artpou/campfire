import type { User } from "@/modules/user/user.schema";

export type AuthUser = User & { countIndexerManagers: number };
