"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import {
  deleteCommentSchema,
  type DeleteCommentInput,
} from "@/features/comments/schemas/comment.schema";

export async function deleteCommentAction(input: DeleteCommentInput) {
  const session = await requireSession("You must be signed in to delete a comment.");
  enforceActionLimit("comment", session.user.id);

  const { commentId } = deleteCommentSchema.parse(input);

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true, isDeleted: true, post: { select: { slug: true } } },
  });
  if (!comment || comment.isDeleted) throw new Error("Comment not found.");
  if (comment.authorId !== session.user.id) {
    throw new Error("You can only delete your own comments.");
  }

  await db.$transaction(async (tx) => {
    // The `isDeleted: false` condition lives in the UPDATE itself: if the same comment is deleted twice at
    // once, only one request changes the row and only that one touches the counter.
    const deleted = await tx.comment.updateMany({
      where: { id: commentId, authorId: session.user.id, isDeleted: false },
      data: { isDeleted: true },
    });
    if (deleted.count === 0) return;
    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });
  });

  revalidatePath(`/articles/${comment.post.slug}`);
}
