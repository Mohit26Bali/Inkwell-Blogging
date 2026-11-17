"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  updateCommentSchema,
  type UpdateCommentInput,
} from "@/features/comments/schemas/comment.schema";
import { updateCommentAction } from "@/features/comments/actions/update-comment.action";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function EditCommentForm({
  commentId,
  initialContent,
  onSuccess,
  onCancel,
}: {
  commentId: string;
  initialContent: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateCommentInput>({
    resolver: zodResolver(updateCommentSchema),
    defaultValues: { commentId, content: initialContent },
  });

  function onSubmit(values: UpdateCommentInput) {
    startTransition(async () => {
      try {
        await updateCommentAction(values);
        onSuccess();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update comment.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Textarea
        {...form.register("content")}
        autoFocus
        rows={3}
        className="resize-none"
      />
      {form.formState.errors.content && (
        <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
