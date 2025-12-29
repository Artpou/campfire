import React from "react";

import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { api } from "@/lib/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { useAuthStore } from "@/features/auth/auth-store";

export const Route = createFileRoute("/_auth/login")({
  component: Login,
});

interface LoginForm {
  username: string;
  password: string;
}

function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = React.useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const { mutate: login, isPending } = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await api.auth.login.post(data);
      if (response.error) {
        throw new Error("Login failed");
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        setUser(data);
        navigate({ to: "/", search: { tab: "movie" } });
      }
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "An error occurred");
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
                required: "Username is required",
                minLength: { value: 3, message: "Min 3 characters" },
              })}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password">
              <Trans>Password</Trans>
            </label>
            <Input
              id="password"
              type="password"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <Trans>Loading...</Trans> : <Trans>Login</Trans>}
          </Button>

          <p className="text-sm text-center">
            <Trans>Don't have an account?</Trans>{" "}
            <Link to="/signup" className="text-primary hover:underline">
              <Trans>Sign up</Trans>
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
