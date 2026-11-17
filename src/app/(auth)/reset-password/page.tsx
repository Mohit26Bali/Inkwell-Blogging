import Link from "next/link";
import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/password-reset-forms";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
  // The link carries a secret token: don't leak it to other sites through the Referer header.
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : "";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      {raw ? (
        <ResetPasswordForm token={raw} />
      ) : (
        <p className="text-sm text-muted-foreground">
          This link is incomplete.{" "}
          <Link href="/forgot-password" className="font-medium text-foreground hover:underline">
            Request a new one
          </Link>
        </p>
      )}
    </div>
  );
}
