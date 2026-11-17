"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { toggleFeaturedAction } from "@/features/admin/actions/manage-post.action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeaturedToggleButton({
  postId,
  isFeatured,
}: {
  postId: string;
  isFeatured: boolean;
}) {
  const [featured, setFeatured] = useState(isFeatured);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !featured;
    setFeatured(next);
    startTransition(async () => {
      try {
        await toggleFeaturedAction(postId);
      } catch (error) {
        setFeatured(!next);
        toast.error(error instanceof Error ? error.message : "Failed to update post.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={featured}
      aria-label={featured ? "Remove from featured" : "Mark as featured"}
    >
      <Star className={cn("size-4", featured && "fill-current text-amber-500")} />
    </Button>
  );
}
