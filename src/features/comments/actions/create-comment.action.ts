"use server";

import { revalidatePath } from "next/cache";

import { requireVerifiedSession } from "@/server/auth/require-session";
import { assertNotSpam } from "@/features/comments/spam-filter";
import { allowAction, enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import { sendCommentNotificationEmail } from "@/server/email/send";
import {
  createCommentSchema,
  type CreateCommentInput,
} from "@/features/comments/schemas/comment.schema";

function excerpt(text: string, maxLength = 140): string {
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

export async function createCommentAction(input: CreateCommentInput) {
  const session = await requireVerifiedSession("You must be signed in to comment.");
  enforceActionLimit("comment", session.user.id);

  const { postId, content, parentId } = createCommentSchema.parse(input);
  await assertNotSpam(content, session.user.id);

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      slug: true,
      title: true,
      status: true,
      authorId: true,
      author: {
        select: { email: true, name: true, settings: { select: { emailOnComment: true } } },
      },
    },
  });
  // Only published posts can be commented on (drafts/archived posts are invisible to readers; commenting
  // on one would also notify the author and leak the private title).
  if (!post || post.status !== "PUBLISHED") throw new Error("Post not found.");

  const parent = parentId
    ? await db.comment.findUnique({
        where: { id: parentId },
        select: {
          postId: true,
          authorId: true,
          author: {
            select: { email: true, name: true, settings: { select: { emailOnComment: true } } },
          },
        },
      })
    : null;
  if (parentId && (!parent || parent.postId !== postId)) {
    throw new Error("Invalid parent comment.");
  }

  const comment = await db.$transaction(async (tx) => {
    // Only the id is selected: a Server Action's return value is serialized to the browser, and this one
    // used to ship the whole author record — including the password hash and e-mail — with every comment.
    const created = await tx.comment.create({
      data: { postId, authorId: session.user.id, content, parentId },
      select: { id: true },
    });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

    // Replies notify the comment's author; top-level comments notify the post's author.
    const recipient = parent ?? { authorId: post.authorId, author: post.author };
    if (recipient.authorId !== session.user.id) {
      await tx.notification.create({
        data: {
          type: parent ? "COMMENT_REPLY" : "COMMENT",
          message: parent
            ? `${session.user.name ?? "Someone"} replied to your comment on "${post.title}"`
            : `${session.user.name ?? "Someone"} commented on your post "${post.title}"`,
          link: `/articles/${post.slug}`,
          recipientId: recipient.authorId,
          actorId: session.user.id,
        },
      });
    }

    return created;
  });

  const recipient = parent ?? { authorId: post.authorId, author: post.author };
  if (
    recipient.authorId !== session.user.id &&
    recipient.author.settings?.emailOnComment !== false &&
    // Anti e-mail-flooding: at most one e-mail per commenter→recipient pair per window (the in-app
    // notification above is still created for every comment).
    allowAction("commentEmail", `${session.user.id}:${recipient.authorId}`)
  ) {
    await sendCommentNotificationEmail({
      to: recipient.author.email,
      recipientName: recipient.author.name ?? "there",
      commenterName: session.user.name ?? "Someone",
      postTitle: post.title,
      commentExcerpt: excerpt(content),
      articleSlug: post.slug,
      isReply: Boolean(parent),
    });
  }

  revalidatePath(`/articles/${post.slug}`);
  return comment;
}
