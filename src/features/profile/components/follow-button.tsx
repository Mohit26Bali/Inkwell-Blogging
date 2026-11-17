"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { toggleFollowAction } from "@/features/profile/actions/toggle-follow.action";
import { Button } from "@/components/ui/button";
import { AuthRequiredDialog } from "@/components/auth-required-dialog";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetUserId,
  initialFollowing,
  isAuthenticated,
  isSelf,
  className,
  size = "sm",
}: {
  targetUserId: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  isSelf: boolean;
  className?: string;
  size?: "sm" | "default";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  if (isSelf) return null;

  function handleClick() {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        await toggleFollowAction(targetUserId);
      } catch (error) {
        setFollowing(!next);
        toast.error(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Button
        variant={following ? "outline" : "default"}
        size={size}
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={following}
        className={cn("min-w-24", className)}
      >
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        {following ? "Following" : "Follow"}
      </Button>
      <AuthRequiredDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        message="Sign in to follow writers."
      />
    </>
  );
}
