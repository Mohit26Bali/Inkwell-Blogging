"use client";

import { useState, useTransition } from "react";
import { Heart, Bookmark, Link2, Check } from "lucide-react";
import { toast } from "sonner";

import { toggleLikeAction } from "@/features/posts/actions/toggle-like.action";
import { toggleBookmarkAction } from "@/features/bookmarks/actions/toggle-bookmark.action";
import { Button } from "@/components/ui/button";
import { AuthRequiredDialog } from "@/components/auth-required-dialog";
import { cn } from "@/lib/utils";

export function ArticleActions({
  postId,
  initialLikeCount,
  initialLiked,
  initialBookmarked,
  isAuthenticated,
}: {
  postId: string;
  initialLikeCount: number;
  initialLiked: boolean;
  initialBookmarked: boolean;
  isAuthenticated: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [copied, setCopied] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [, startTransition] = useTransition();

  function requireAuth() {
    if (isAuthenticated) return true;
    setShowAuthDialog(true);
    return false;
  }

  function toggleLike() {
    if (!requireAuth()) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => count + (nextLiked ? 1 : -1));
    startTransition(async () => {
      try {
        await toggleLikeAction(postId);
      } catch {
        setLiked(!nextLiked);
        setLikeCount((count) => count + (nextLiked ? -1 : 1));
        toast.error("Something went wrong — try again.");
      }
    });
  }

  function toggleBookmark() {
    if (!requireAuth()) return;
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);
    startTransition(async () => {
      try {
        await toggleBookmarkAction(postId);
      } catch {
        setBookmarked(!nextBookmarked);
        toast.error("Something went wrong — try again.");
      }
    });
  }

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLike}
        aria-pressed={liked}
        className={cn(liked && "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950")}
      >
        <Heart className={cn("size-4", liked && "fill-current")} />
        {likeCount.toLocaleString()}
      </Button>
      <Button variant="outline" size="sm" onClick={toggleBookmark} aria-pressed={bookmarked}>
        <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
      </Button>
      <Button variant="outline" size="sm" onClick={handleShare}>
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
        {copied ? "Copied" : "Share"}
      </Button>
      <AuthRequiredDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        message="Sign in to like or bookmark articles."
      />
    </div>
  );
}
