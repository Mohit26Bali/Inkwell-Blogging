"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { toggleUserBanAction } from "@/features/admin/actions/manage-user.action";
import { Button } from "@/components/ui/button";

export function BanToggleButton({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const [banned, setBanned] = useState(isBanned);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !banned;
    setBanned(next);
    startTransition(async () => {
      try {
        await toggleUserBanAction(userId);
      } catch (error) {
        setBanned(!next);
        toast.error(error instanceof Error ? error.message : "Failed to update user.");
      }
    });
  }

  return (
    <Button
      variant={banned ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending && <Loader2 className="size-3.5 animate-spin" />}
      {banned ? "Unban" : "Ban"}
    </Button>
  );
}
