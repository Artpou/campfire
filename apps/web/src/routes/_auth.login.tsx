import { signInSchema } from "@basement/validators/auth.validators";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import type { Static } from "@sinclair/typebox";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormInput } from "@/components/ui/form-input";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/_auth/login")({
  component: Login,
});

type LoginFormValues = Static<typeof signInSchema>;

function Login() {
  const navigate = useNavigate();
  const form = useForm<LoginFormValues>({
    resolver: typeboxResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await authClient.signIn.username({
        username: data.username,
        password: data.password,
      });

      if (response.error) {
        throw new Error(response.error.message || "Login failed");
      }

      // Redirect to home after successful login
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormInput<LoginFormValues>
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
            />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:text-primary/80 underline">
                Sign up
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
