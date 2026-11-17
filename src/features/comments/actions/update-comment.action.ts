"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { assertNotSpam } from "@/features/comments/spam-filter";
import { db } from "@/server/db/client";
import {
  updateCommentSchema,
  type UpdateCommentInput,
} from "@/features/comments/schemas/comment.schema";

export async function updateCommentAction(input: UpdateCommentInput) {
  const session = await requireSession("You must be signed in to edit a comment.");
  enforceActionLimit("comment", session.user.id);

  const { commentId, content } = updateCommentSchema.parse(input);
  await assertNotSpam(content, session.user.id, { checkDuplicates: false });

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, isDeleted: true, post: { select: { slug: true } } },
  });
  if (!comment || comment.isDeleted) throw new Error("Comment not found.");
  if (comment.authorId !== session.user.id) {
    throw new Error("You can only edit your own comments.");
  }

  await db.comment.update({
    where: { id: commentId },
    data: { content, isEdited: true },
  });

  revalidatePath(`/articles/${comment.post.slug}`);
}
