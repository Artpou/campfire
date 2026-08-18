import { t } from "@lingui/core/macro";
import type { ChangePasswordInput, UpdateProfileInput } from "@seedarr/contracts";
import { api, unwrap, unwrapForm } from "@seedarr/sdk";
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
  stats: (id: string) =>
    queryOptions({
      queryKey: [...userQueries.key, id, "stats"],
      queryFn: () => unwrap(api.users[":id"].stats.$get({ param: { id } })),
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
      toast.info(t`Profile updated`);
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
      return unwrapForm<{ id: string; avatarPath: string | null }>("/users/me/avatar", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data) => {
      invalidateUserQueries(queryClient);
      const current = useAuth.getState().user;
      if (current && current.id === data.id) {
        useAuth.getState().setUser({ ...current, avatarPath: data.avatarPath });
      }
      toast.info(t`Profile picture updated`);
    },
    onError: (error) => {
      toast.error(t`Could not update profile picture`, { description: formatError(error) });
    },
  });
}

export function useSyncLetterboxd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrapForm<{ synced: number; skipped: number; errors: number }>("/users/me/letterboxd/sync", {
        method: "POST",
        signal: AbortSignal.timeout(10 * 60 * 1000),
      }),
    onSuccess: (data) => {
      invalidateUserQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.info(t`Letterboxd synchronized`, {
        description: t`${data.synced} imported · ${data.skipped} skipped · ${data.errors} errors`,
      });
    },
    onError: (error) => {
      toast.error(t`Letterboxd sync failed`, { description: formatError(error) });
    },
  });
}

export function useImportLetterboxd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return unwrapForm<{ synced: number; skipped: number; errors: number }>("/users/me/letterboxd/import", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(10 * 60 * 1000),
      });
    },
    onSuccess: async (data) => {
      invalidateUserQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["media"] });
      const current = useAuth.getState().user;
      if (current) {
        const profile = await queryClient.fetchQuery(userQueries.details(current.id));
        useAuth.getState().setUser({ ...current, letterboxdUsername: profile.letterboxdUsername });
      }
      toast.success(t`Letterboxd imported`, {
        description: t`${data.synced} imported · ${data.skipped} skipped · ${data.errors} errors`,
      });
    },
    onError: (error) => {
      toast.error(t`Letterboxd import failed`, { description: formatError(error) });
    },
  });
}
