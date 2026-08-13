import { t } from "@lingui/core/macro";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-store";

export function useCompleteOnboarding(kind: "owner" | "member") {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrap(api.users.me.onboarded.$post()),
    onSuccess: (user) => {
      useAuth.getState().setUser({
        ...user,
        countIndexerManagers: useAuth.getState().user?.countIndexerManagers ?? 0,
      });
      queryClient.setQueryData(["auth", "me"], (prev: unknown) => {
        if (prev && typeof prev === "object") {
          return { ...prev, ...user, onboarded: true };
        }
        return user;
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      toast.success(
        kind === "owner"
          ? t`Welcome to Seedarr! Your instance is ready.`
          : t`Welcome to Seedarr! Your profile is ready.`,
      );
      navigate({ to: "/" });
    },
    onError: (error) => {
      toast.error(t`Could not finish onboarding`, { description: formatError(error) });
    },
  });
}
