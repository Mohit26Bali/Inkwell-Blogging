import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getActiveSession } from "@/server/auth/require-session";
import { db } from "@/server/db/client";
import { AccountControls } from "@/features/account/components/account-controls";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default async function SettingsPage() {
  const session = await getActiveSession();
  if (!session) redirect("/login?callbackUrl=/settings");

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Account settings</h1>
      <p className="mb-10 mt-1 text-muted-foreground">{session.user.email}</p>
      <AccountControls hasPassword={Boolean(user?.passwordHash)} />
    </div>
  );
}
