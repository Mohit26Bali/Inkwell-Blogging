"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";

import { toggleCollectionItemAction } from "@/features/collections/actions/collection.action";
import { Button } from "@/components/ui/button";

export function RemoveFromListButton({
  collectionId,
  postId,
}: {
  collectionId: string;
  postId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await toggleCollectionItemAction(collectionId, postId);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove article.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <X className="size-3.5" />
      Remove from list
    </Button>
  );
}
