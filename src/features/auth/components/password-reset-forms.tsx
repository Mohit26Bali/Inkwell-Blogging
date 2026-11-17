"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { requestPasswordResetAction, resetPasswordAction } from "@/features/auth/actions/password-reset.action";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const result = await requestPasswordResetAction(email);
            setMessage(
              result.ok
                ? { text: "If that address has an account, we've sent a reset link. It expires in 1 hour.", error: false }
                : { text: result.error, error: true }
            );
          } catch {
            setMessage({ text: "Something went wrong. Please try again.", error: true });
          }
        });
      }}
    >
      <Input type="email" required autoComplete="email" placeholder="ada@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      {message && <p className={message.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>}
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        Your password was changed.{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const result = await resetPasswordAction(token, password);
            if (result.ok) setDone(true);
            else setMessage(result.error);
          } catch {
            setMessage("Something went wrong. Please try again.");
          }
        });
      }}
    >
      <PasswordInput required autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <p className="text-xs text-muted-foreground">At least 8 characters, with upper and lower case letters and a number.</p>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </form>
  );
}
