import { t } from "@lingui/core/macro";
import type { ChangePasswordInput, UpdateProfileInput } from "@seedarr/contracts";
import { api, getBaseUrl, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-store";

export const userQueries = {
  key: ["users"] as const,
  list: () =>
    queryOptions({
      queryKey: [...userQueries.key],
      queryFn: () => unwrap(api.users.$get()),
    }),
  details: (id: string) =>
    queryOptions({
      queryKey: [...userQueries.key, id],
      queryFn: () => unwrap(api.users[":id"].$get({ param: { id } })),
    }),
};

function invalidateUserQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: userQueries.key });
  queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => unwrap(api.users.me.$patch({ json: input })),
    onSuccess: (data) => {
      invalidateUserQueries(queryClient);
      const current = useAuth.getState().user;
      if (current && current.id === data.id) {
        useAuth.getState().setUser({ ...current, ...data });
      }
      toast.success(t`Profile updated`);
    },
    onError: (error) => {
      toast.error(t`Could not update profile`, { description: formatError(error) });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => unwrap(api.users.me.password.$post({ json: input })),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${getBaseUrl()}/users/me/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        let message = `API Error: ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      return res.json() as Promise<{ id: string; avatarPath: string | null }>;
    },
    onSuccess: (data) => {
      invalidateUserQueries(queryClient);
      const current = useAuth.getState().user;
      if (current && current.id === data.id) {
        useAuth.getState().setUser({ ...current, avatarPath: data.avatarPath });
      }
      toast.success(t`Profile picture updated`);
    },
    onError: (error) => {
      toast.error(t`Could not update profile picture`, { description: formatError(error) });
    },
  });
}
