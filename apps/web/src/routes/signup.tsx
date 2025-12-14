import { signUpSchema } from "@basement/validators/auth.validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/ui/form-input";
import { signUp } from "../lib/auth";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

type SignupFormValues = z.infer<typeof signUpSchema>;

function Signup() {
  const navigate = useNavigate();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const onSubmit = async (data: SignupFormValues) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const { confirmPassword: _confirmPassword, ...signUpData } = data;
      const result = await signUp.email({
        email: signUpData.email,
        password: signUpData.password,
        name: signUpData.name || "",
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account");
      } else {
        setSuccess(true);
        form.reset();
        // Redirect to home or login page after successful signup
        setTimeout(() => {
          navigate({ to: "/" });
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormInput name="name" label="Name (Optional)" type="text" placeholder="John Doe" />

              <FormInput name="email" label="Email" type="email" placeholder="you@example.com" />

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
                  <p className="text-sm text-primary">
                    Account created successfully! Redirecting...
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating account..." : "Sign Up"}
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
    </div>
  );
}
