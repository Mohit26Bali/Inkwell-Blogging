"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";

export async function toggleBookmarkAction(postId: string) {
  const session = await requireSession("You must be signed in to bookmark a post.");
  enforceActionLimit("interaction", session.user.id);

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { slug: true, status: true, authorId: true },
  });
  if (!post || (post.status !== "PUBLISHED" && post.authorId !== session.user.id)) {
    throw new Error("Post not found.");
  }

  // Race-safe toggle (see toggle-like.action.ts).
  const bookmarked = await db.$transaction(async (tx) => {
    const removed = await tx.bookmark.deleteMany({ where: { userId: session.user.id, postId } });
    if (removed.count > 0) {
      await tx.post.update({ where: { id: postId }, data: { bookmarkCount: { decrement: 1 } } });
      return false;
    }

    const added = await tx.bookmark.createMany({
      data: [{ userId: session.user.id, postId }],
      skipDuplicates: true,
    });
    if (added.count > 0) {
      await tx.post.update({ where: { id: postId }, data: { bookmarkCount: { increment: 1 } } });
    }
    return true;
  });

  revalidatePath(`/articles/${post.slug}`);
  return { bookmarked };
}
