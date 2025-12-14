import { z } from "zod";

// User ID schema (for queries)
export const userIdSchema = z.string();

// User output schema (for responses)
export const userOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User input schema (for create mutations - if needed later)
export const userInputSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Password confirmation must be at least 8 characters.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// Export types
export type UserId = z.infer<typeof userIdSchema>;
export type UserOutput = z.infer<typeof userOutputSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
