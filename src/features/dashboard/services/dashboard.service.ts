import "server-only";

import { db } from "@/server/db/client";

export async function getDashboardStats(userId: string) {
  const [
    publishedCount,
    draftCount,
    followerCount,
    followingCount,
    bookmarkCount,
    aggregates,
  ] = await Promise.all([
    db.post.count({ where: { authorId: userId, status: "PUBLISHED" } }),
    db.post.count({ where: { authorId: userId, status: "DRAFT" } }),
    db.follow.count({ where: { followingId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
    db.bookmark.count({ where: { userId } }),
    db.post.aggregate({
      where: { authorId: userId, status: "PUBLISHED" },
      _sum: { viewCount: true, likeCount: true, commentCount: true },
    }),
  ]);

  return {
    publishedCount,
    draftCount,
    followerCount,
    followingCount,
    bookmarkCount,
    totalViews: aggregates._sum.viewCount ?? 0,
    totalLikes: aggregates._sum.likeCount ?? 0,
    totalComments: aggregates._sum.commentCount ?? 0,
  };
}

export function getUserPosts(userId: string, take = 10) {
  return db.post.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      updatedAt: true,
    },
  });
}

export function getRecentActivity(userId: string, take = 8) {
  return db.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { include: { profile: true } } },
  });
}
