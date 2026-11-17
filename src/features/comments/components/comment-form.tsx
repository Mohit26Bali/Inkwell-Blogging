"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  createCommentSchema,
  type CreateCommentInput,
} from "@/features/comments/schemas/comment.schema";
import { createCommentAction } from "@/features/comments/actions/create-comment.action";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CommentForm({
  postId,
  parentId,
  onSuccess,
  autoFocus = false,
  placeholder = "Add to the discussion…",
}: {
  postId: string;
  parentId?: string;
  onSuccess?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { postId, parentId, content: "" },
  });

  function onSubmit(values: CreateCommentInput) {
    startTransition(async () => {
      try {
        await createCommentAction(values);
        form.reset({ postId, parentId, content: "" });
        onSuccess?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to post comment.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Textarea
        {...form.register("content")}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        className="resize-none"
      />
      {form.formState.errors.content && (
        <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </form>
  );
}
