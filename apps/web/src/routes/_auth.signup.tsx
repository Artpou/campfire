import { signUpSchema } from "@basement/validators/auth.validators";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import type { Static } from "@sinclair/typebox";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/ui/form-input";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/_auth/signup")({
  component: Signup,
});

type SignupFormValues = Static<typeof signUpSchema>;

function Signup() {
  const navigate = useNavigate();
  const form = useForm<SignupFormValues>({
    resolver: typeboxResolver(signUpSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Custom password matching validation
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "password" || name === "confirmPassword") {
        if (value.password && value.confirmPassword && value.password !== value.confirmPassword) {
          form.setError("confirmPassword", {
            type: "manual",
            message: "Passwords do not match.",
          });
        } else if (value.password === value.confirmPassword) {
          form.clearErrors("confirmPassword");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: SignupFormValues) => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      // Use mock email format: username@local.user
      const response = await authClient.signUp.email({
        email: `${data.username}@local.user`,
        name: data.username,
        password: data.password,
        username: data.username,
      });

      if (response.error) {
        throw new Error(response.error.message || "Registration failed");
      }

      setSuccess(true);
      form.reset();
      // Redirect to home after successful signup
      setTimeout(() => {
        navigate({ to: "/" });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormInput name="username" label="Username" type="text" placeholder="username" />

            <FormInput name="password" label="Password" type="password" placeholder="••••••••" />

            <FormInput
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
            />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary">Account created successfully! Redirecting...</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 underline">
                Sign in
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
