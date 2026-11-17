"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import { sendLikeNotificationEmail } from "@/server/email/send";

export async function toggleLikeAction(postId: string) {
  const session = await requireSession("You must be signed in to like a post.");
  enforceActionLimit("interaction", session.user.id);

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      slug: true,
      title: true,
      status: true,
      authorId: true,
      author: {
        select: { email: true, name: true, settings: { select: { emailOnLike: true } } },
      },
    },
  });
  // Unpublished posts are invisible to everyone but their author, so they can't be interacted with either.
  if (!post || (post.status !== "PUBLISHED" && post.authorId !== session.user.id)) {
    throw new Error("Post not found.");
  }

  // Race-safe toggle: every step is a single conditional statement, so two clicks at once (double-click,
  // two tabs) can neither crash on the unique constraint nor leave the counter out of step with the rows.
  const result = await db.$transaction(async (tx) => {
    const removed = await tx.reaction.deleteMany({ where: { userId: session.user.id, postId } });
    if (removed.count > 0) {
      await tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false, created: false };
    }

    const added = await tx.reaction.createMany({
      data: [{ userId: session.user.id, postId, type: "LIKE" }],
      skipDuplicates: true,
    });
    if (added.count === 0) return { liked: true, created: false }; // a parallel request already liked it

    await tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });

    if (post.authorId !== session.user.id) {
      await tx.notification.create({
        data: {
          type: "LIKE",
          message: `${session.user.name ?? "Someone"} liked your post "${post.title}"`,
          link: `/articles/${post.slug}`,
          recipientId: post.authorId,
          actorId: session.user.id,
        },
      });
    }

    return { liked: true, created: true };
  });

  if (
    result.created &&
    post.authorId !== session.user.id &&
    post.author.settings?.emailOnLike === true
  ) {
    await sendLikeNotificationEmail({
      to: post.author.email,
      recipientName: post.author.name ?? "there",
      likerName: session.user.name ?? "Someone",
      postTitle: post.title,
      articleSlug: post.slug,
    });
  }

  revalidatePath(`/articles/${post.slug}`);
  return { liked: result.liked };
}
