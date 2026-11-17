import { db } from "@/server/db/client";

export function getProfileByUsername(username: string) {
  return db.user.findFirst({
    where: { profile: { username } },
    include: {
      profile: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
}

export async function getFollowingIds(currentUserId: string | undefined, targetUserIds: string[]) {
  if (!currentUserId || targetUserIds.length === 0) return new Set<string>();

  const follows = await db.follow.findMany({
    where: { followerId: currentUserId, followingId: { in: targetUserIds } },
    select: { followingId: true },
  });

  return new Set(follows.map((f) => f.followingId));
}

export async function getIsFollowing(currentUserId: string | undefined, targetUserId: string) {
  if (!currentUserId || currentUserId === targetUserId) return false;

  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
  });

  return Boolean(follow);
}

export function getUserPublishedPosts(userId: string, take = 20) {
  return db.post.findMany({
    where: { authorId: userId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take,
    include: {
      author: { include: { profile: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });
}
