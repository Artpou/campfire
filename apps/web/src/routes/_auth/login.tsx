import React from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { useAuth } from "@/features/auth/auth-store";

export const Route = createFileRoute("/_auth/login")({
  component: Login,
  beforeLoad: async () => {
    const isAuthenticated = useAuth.getState().user;
    if (isAuthenticated) throw redirect({ to: "/" });

    const data = await unwrap(api.auth["has-owner"].$get());
    if (!data.hasOwner) {
      throw redirect({ to: "/signup" });
    }
  },
});

interface LoginForm {
  username: string;
  password: string;
}

function Login() {
  const navigate = useNavigate();
  const { t } = useLingui();
  const [error, setError] = React.useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const { mutate: login, isPending } = useMutation({
    mutationFn: (data: LoginForm) => unwrap(api.auth.login.$post({ json: data })),
    onSuccess: () => navigate({ to: "/" }),
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t(msg`An error occurred`));
    },
  });

  const onSubmit = (data: LoginForm) => {
    setError(undefined);
    login(data);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <Trans>Login</Trans>
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
              {...register("password", { required: t(msg`Password is required`) })}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <Trans>Loading...</Trans> : <Trans>Login</Trans>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
