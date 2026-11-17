"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccountAction, exportMyDataAction } from "@/features/account/actions/account.action";

export function AccountControls({ hasPassword }: { hasPassword: boolean }) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [exporting, startExport] = useTransition();
  const [deleting, startDelete] = useTransition();

  function download() {
    setExportMessage(null);
    startExport(async () => {
      try {
        const result = await exportMyDataAction();
        if (!result.ok) return setExportMessage(result.error);
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "inkwell-my-data.json";
        a.click();
        URL.revokeObjectURL(url);
        setExportMessage("Your data was downloaded.");
      } catch {
        setExportMessage("Something went wrong. Please try again.");
      }
    });
  }

  function remove() {
    setDeleteMessage(null);
    startDelete(async () => {
      try {
        const result = await deleteAccountAction({ confirmation, password: hasPassword ? password : undefined });
        if (!result.ok) return setDeleteMessage(result.error);
        await signOut({ callbackUrl: "/" });
      } catch {
        setDeleteMessage("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Download your data</h2>
        <p className="text-sm text-muted-foreground">
          Your profile, posts, comments, bookmarks and follows as a JSON file.
        </p>
        <Button variant="outline" onClick={download} disabled={exporting}>
          {exporting ? "Preparing…" : "Download my data"}
        </Button>
        {exportMessage && <p className="text-sm text-muted-foreground">{exportMessage}</p>}
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/40 p-5">
        <h2 className="text-lg font-medium text-destructive">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          This permanently removes your account, posts, comments, likes, bookmarks and follows. It can&apos;t be undone.
        </p>
        {hasPassword && (
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <Input
          placeholder='Type "delete my account"'
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <Button variant="destructive" onClick={remove} disabled={deleting || !confirmation}>
          {deleting ? "Deleting…" : "Delete my account"}
        </Button>
        {deleteMessage && <p className="text-sm text-destructive">{deleteMessage}</p>}
      </section>
    </div>
  );
}
