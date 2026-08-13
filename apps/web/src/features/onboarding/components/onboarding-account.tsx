import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { RegisterInput } from "@seedarr/contracts";
import type { AuthUser } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Input } from "@/shared/ui/input";

import { useAuth } from "@/features/auth/auth-store";
import { OnboardingLanguage } from "@/features/onboarding/components/onboarding-language";
import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";

type SignupForm = RegisterInput & { confirmPassword: string };

interface OnboardingAccountProps {
  onContinue: () => void;
}

export function OnboardingAccount({ onContinue }: OnboardingAccountProps) {
  const user = useAuth((s) => s.user);
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>();

  const password = watch("password");

  const { mutate: signup, isPending } = useMutation({
    mutationFn: (data: RegisterInput) => unwrap(api.auth.register.$post({ json: data })),
    onSuccess: (created) => {
      const authUser: AuthUser = { ...created, countIndexerManagers: 0 };
      useAuth.getState().setUser(authUser);
      queryClient.setQueryData(["auth", "me"], authUser);
      onContinue();
    },
    onError: (err: unknown) => {
      setError(formatError(err) || t(msg`An error occurred`));
    },
  });

  if (user) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            <Trans>Your owner account</Trans>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <Trans>
              Signed in as {user.username}. Choose the interface language to continue setting up your instance.
            </Trans>
          </p>
        </div>
        <OnboardingLanguage />
        <OnboardingNav hideBack onContinue={onContinue} />
      </div>
    );
  }

  const onSubmit = (data: SignupForm) => {
    setError(null);
    signup({ username: data.username, password: data.password });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          <Trans>Create owner account</Trans>
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <Trans>This first account owns the instance. You can invite household members later.</Trans>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="username" className="text-sm font-medium">
            <Trans>Username</Trans>
          </label>
          <Input
            id="username"
            autoComplete="username"
            {...register("username", {
              required: t(msg`Username is required`),
              minLength: { value: 3, message: t(msg`Min 3 characters`) },
            })}
          />
          {errors.username && <p className="text-destructive text-sm">{errors.username.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium">
            <Trans>Password</Trans>
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password", {
              required: t(msg`Password is required`),
              minLength: { value: 8, message: t(msg`Min 8 characters`) },
            })}
          />
          {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            <Trans>Confirm Password</Trans>
          </label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword", {
              required: t(msg`Please confirm your password`),
              validate: (value) => value === password || t(msg`Passwords do not match`),
            })}
          />
          {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <OnboardingLanguage />

      <OnboardingNav hideBack onContinue={handleSubmit(onSubmit)} continueLoading={isPending} />
    </form>
  );
}
