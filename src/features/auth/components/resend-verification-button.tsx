"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { resendVerificationAction } from "@/features/auth/actions/resend-verification.action";

export function ResendVerificationButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await resendVerificationAction();
              setMessage(
                result.status === "sent"
                  ? "Verification email sent. Check your inbox."
                  : result.status === "already-verified"
                    ? "Your email is already verified."
                    : result.error
              );
            } catch {
              setMessage("Something went wrong. Please try again.");
            }
          })
        }
      >
        {pending ? "Sending…" : "Send verification email"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
