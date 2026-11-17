import { z } from "zod";

import { isCommonPassword } from "@/lib/password";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  // bcrypt silently ignores bytes past 72 — reject before that surprises anyone.
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .refine((value) => !isCommonPassword(value), {
    message: "This password is too common — choose something less guessable",
  });

// E-mail addresses are compared case-insensitively everywhere: "Ada@X.com" and "ada@x.com" are the same
// mailbox, and treating them as different accounts allowed duplicate/impersonating registrations.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email address is too long");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, hyphens and underscores only"),
  email: emailSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
