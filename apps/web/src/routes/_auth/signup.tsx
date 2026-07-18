import React from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { RegisterInput } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { useAuth } from "@/features/auth/auth-store";

export const Route = createFileRoute("/_auth/signup")({
  component: Signup,
  beforeLoad: async () => {
    const isAuthenticated = useAuth.getState().user;
    if (isAuthenticated) throw redirect({ to: "/" });

    const data = await unwrap(api.auth["has-owner"].$get());
    if (data.hasOwner) {
      throw redirect({ to: "/login" });
    }
  },
});

type SignupForm = RegisterInput & { confirmPassword: string };

function Signup() {
  const navigate = useNavigate();
  const { t } = useLingui();
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>();

  const password = watch("password");

  const { mutate: signup, isPending } = useMutation({
    mutationFn: (data: RegisterInput) => unwrap(api.auth.register.$post({ json: data })),
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t(msg`An error occurred`));
    },
  });

  const onSubmit = (data: SignupForm) => {
    setError(null);
    signup({ username: data.username, password: data.password });
  };

  return (
    <Card className="w-full max-w-md bg-background">
      <CardHeader>
        <CardTitle>
          <Trans>Create Owner Account</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="username">
              <Trans>Username</Trans>
            </label>
            <Input
              id="username"
              {...register("username", {
                required: t(msg`Username is required`),
                minLength: { value: 3, message: t(msg`Min 3 characters`) },
              })}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="password">
              <Trans>Password</Trans>
            </label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: t(msg`Password is required`),
                minLength: { value: 8, message: t(msg`Min 8 characters`) },
              })}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword">
              <Trans>Confirm Password</Trans>
            </label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword", {
                required: t(msg`Please confirm your password`),
                validate: (value) => value === password || t(msg`Passwords do not match`),
              })}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <Trans>Creating account...</Trans> : <Trans>Sign Up</Trans>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
