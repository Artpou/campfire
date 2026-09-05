import type { LoginInput, RegisterInput } from "@seedarr/contracts";
import type { AuthUser } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/auth-store";

const authQueries = {
  key: ["auth"] as const,
  me: () =>
    queryOptions({
      queryKey: [...authQueries.key, "me"],
      queryFn: () => unwrap(api.auth.me.$get()),
    }),
  hasOwner: () =>
    queryOptions({
      queryKey: [...authQueries.key, "has-owner"],
      queryFn: () => unwrap(api.auth["has-owner"].$get()),
    }),
};

export function useLogin(onSuccess?: () => void, onError?: (message: string) => void) {
  return useMutation({
    mutationFn: (data: LoginInput) => unwrap(api.auth.login.$post({ json: data })),
    onSuccess: () => onSuccess?.(),
    onError: (err: unknown) => onError?.(formatError(err)),
  });
}

export function useRegister(onSuccess?: (user: AuthUser) => void) {
  return useMutation({
    mutationFn: (data: RegisterInput) => unwrap(api.auth.register.$post({ json: data })),
    onSuccess: (user) => onSuccess?.(user as AuthUser),
  });
}

export function useLogout(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const logout = useAuth((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      try {
        await unwrap(api.auth.logout.$post());
      } catch {
        // continue even if server logout fails
      }
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
      onSuccess?.();
    },
  });
}
