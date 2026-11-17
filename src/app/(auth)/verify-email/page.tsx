import Link from "next/link";
import type { Metadata } from "next";

import { auth } from "@/server/auth";
import { verifyEmailToken } from "@/server/auth/email-verification";
import { ResendVerificationButton } from "@/features/auth/components/resend-verification-button";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const rawToken = typeof token === "string" ? token : undefined;

  if (rawToken) {
    const ok = await verifyEmailToken(rawToken);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ok ? "Email verified" : "This link isn't valid"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ok
            ? "Thanks — your address is confirmed. You can publish and comment now."
            : "It may have expired or already been used. Sign in and request a new one."}
        </p>
        <Link href={ok ? "/" : "/verify-email"} className="text-sm font-medium hover:underline">
          {ok ? "Continue to Inkwell" : "Request a new link"}
        </Link>
      </div>
    );
  }

  const session = await auth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
      {session?.user ? (
        <>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email you a link that confirms your address. It expires after 24 hours.
          </p>
          <ResendVerificationButton />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login?callbackUrl=/verify-email" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>{" "}
          to request a verification email.
        </p>
      )}
    </div>
  );
}
