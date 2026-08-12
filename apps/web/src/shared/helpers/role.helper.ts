import { hasMinRole } from "@seedarr/contracts";
import type { User } from "@seedarr/sdk";
import { type LinkOptions, redirect } from "@tanstack/react-router";

export function redirectIfNotRole({ user }: { user: User }, role: User["role"], link: LinkOptions) {
  if (!hasMinRole(user?.role, role)) {
    throw redirect({ ...link, state: { unauthorized: true } });
  }
}
