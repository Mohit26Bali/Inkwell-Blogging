import { db } from "@/server/db/client";

export async function getCommentsForPost(postId: string) {
  const comments = await db.comment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { include: { profile: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { include: { profile: true } } },
      },
    },
  });

  // A deleted top-level comment is dropped entirely unless it still has
  // live replies underneath it, in which case it renders as a tombstone
  // so the replies stay reachable.
  return comments.filter(
    (comment) => !comment.isDeleted || comment.replies.some((reply) => !reply.isDeleted)
  );
}

export type CommentWithReplies = Awaited<ReturnType<typeof getCommentsForPost>>[number];
