"use client";

import { useTransition } from "react";
import type { PostStatus } from "@prisma/client";
import { toast } from "sonner";

import { updatePostStatusAction } from "@/features/admin/actions/manage-post.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: PostStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED", "SCHEDULED"];

export function PostStatusSelect({ postId, status }: { postId: string; status: PostStatus }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      try {
        await updatePostStatusAction(postId, value as PostStatus);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update status.");
      }
    });
  }

  return (
    <Select defaultValue={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
