"use server";

import { requireVerifiedSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import { publishPostSchema, type PublishPostInput } from "@/features/posts/schemas/post.schema";
import { stripHtml } from "@/lib/html";

/** Statuses from which an author may publish. ARCHIVED / IN_REVIEW are set by moderators and stay put. */
const PUBLISHABLE_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED"] as const;

export async function publishPostAction(input: PublishPostInput) {
  const session = await requireVerifiedSession("You must be signed in to publish.");
  enforceActionLimit("publish", session.user.id);

  const { postId } = publishPostSchema.parse(input);

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== session.user.id) {
    throw new Error("Post not found.");
  }

  if (!(PUBLISHABLE_STATUSES as readonly string[]).includes(post.status)) {
    // An admin archived/held this post: the author must not be able to undo that by publishing again.
    throw new Error("This post can't be published right now. Please contact an administrator.");
  }

  if (!post.title.trim()) throw new Error("Add a title before publishing.");

  const plainText = stripHtml(post.content);
  if (plainText.length < 20) {
    throw new Error("Your story needs a bit more content before publishing.");
  }

  // The status condition is re-checked inside the UPDATE, so a moderator archiving the post between the
  // read above and this write still wins.
  const updated = await db.post.updateMany({
    where: { id: postId, authorId: session.user.id, status: { in: [...PUBLISHABLE_STATUSES] } },
    data: {
      status: "PUBLISHED",
      publishedAt: post.publishedAt ?? new Date(),
      excerpt: post.excerpt ?? plainText.slice(0, 200),
    },
  });
  if (updated.count === 0) {
    throw new Error("This post can't be published right now. Please contact an administrator.");
  }

  return { slug: post.slug };
}
