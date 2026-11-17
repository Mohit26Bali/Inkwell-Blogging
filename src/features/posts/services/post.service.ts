import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

export type DiscoverSort = "newest" | "trending" | "most-liked";

export type DiscoverFilters = {
  query?: string;
  categorySlug?: string;
  tagSlug?: string;
  sort?: DiscoverSort;
  page?: number;
  pageSize?: number;
};

const SORT_ORDER_BY: Record<DiscoverSort, Prisma.PostOrderByWithRelationInput> = {
  newest: { publishedAt: "desc" },
  trending: { viewCount: "desc" },
  "most-liked": { likeCount: "desc" },
};

export async function getDiscoverPosts(filters: DiscoverFilters) {
  const { query, categorySlug, tagSlug, sort = "newest", page = 1, pageSize = 9 } = filters;

  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { excerpt: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categorySlug ? { categories: { some: { category: { slug: categorySlug } } } } : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
  };

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: SORT_ORDER_BY[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: postCardInclude,
    }),
    db.post.count({ where }),
  ]);

  return { posts, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getFollowingFeedPosts(
  userId: string,
  { page = 1, pageSize = 9 }: { page?: number; pageSize?: number } = {}
) {
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return { posts: [], total: 0, pageCount: 1 };
  }

  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    authorId: { in: followingIds },
  };

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: postCardInclude,
    }),
    db.post.count({ where }),
  ]);

  return { posts, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export function getFeaturedPosts(take = 3) {
  return db.post.findMany({
    where: { status: "PUBLISHED", isFeatured: true },
    orderBy: { publishedAt: "desc" },
    take,
    include: postCardInclude,
  });
}

export function getLatestPosts(take = 6) {
  return db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take,
    include: postCardInclude,
  });
}

export function getTrendingPosts(take = 5) {
  return db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { viewCount: "desc" },
    take,
    include: postCardInclude,
  });
}

export function getCategoriesWithCounts() {
  return db.category.findMany({
    include: { _count: { select: { posts: true } } },
    orderBy: { name: "asc" },
  });
}

export function getFeaturedWriters(take = 4) {
  return db.user.findMany({
    where: { role: { in: ["WRITER", "ADMIN"] }, profile: { isNot: null } },
    take,
    include: {
      profile: true,
      _count: { select: { posts: true, followers: true } },
    },
    orderBy: { posts: { _count: "desc" } },
  });
}

export function getPostBySlug(slug: string) {
  return db.post.findUnique({
    where: { slug },
    include: {
      author: { include: { profile: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      series: true,
    },
  });
}

export function getRelatedPosts(postId: string, categoryIds: string[], take = 3) {
  return db.post.findMany({
    where: {
      id: { not: postId },
      status: "PUBLISHED",
      categories: { some: { categoryId: { in: categoryIds } } },
    },
    take,
    include: postCardInclude,
  });
}

const postCardInclude = {
  author: { include: { profile: true } },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} as const;

export type PostWithCard = NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>;

export async function getViewerPostState(userId: string | undefined, postId: string) {
  if (!userId) return { liked: false, bookmarked: false };

  const [reaction, bookmark] = await Promise.all([
    db.reaction.findUnique({ where: { userId_postId: { userId, postId } } }),
    db.bookmark.findUnique({ where: { userId_postId: { userId, postId } } }),
  ]);

  return { liked: Boolean(reaction), bookmarked: Boolean(bookmark) };
}
