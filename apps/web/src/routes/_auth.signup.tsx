import React from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { api } from "@/lib/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { useAuthStore } from "@/features/auth/auth-store";

export const Route = createFileRoute("/_auth/signup")({
  component: Signup,
});

interface SignupForm {
  username: string;
  password: string;
  confirmPassword: string;
}

function Signup() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>();

  const password = watch("password");

  const onSubmit = async (data: SignupForm) => {
    setError(null);
    setIsLoading(true);

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.auth.register.post({
        username: data.username,
        password: data.password,
      });

      if (response.error) {
        throw new Error("Registration failed");
      }

      if (response.data) {
        setUser(response.data);
        navigate({ to: "/", search: { tab: "movie" } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <Trans>Sign Up</Trans>
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
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Min 8 characters" },
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword">
              <Trans>Confirm Password</Trans>
            </label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === password || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Trans>Creating account...</Trans> : <Trans>Sign Up</Trans>}
          </Button>

          <p className="text-sm text-center">
            <Trans>Already have an account?</Trans>{" "}
            <Link to="/login" className="text-primary hover:underline">
              <Trans>Sign in</Trans>
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
