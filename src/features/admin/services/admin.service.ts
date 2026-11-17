import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

export async function getAdminStats() {
  const [userCount, postCount, publishedCount, commentCount, pendingReports, subscriberCount] =
    await Promise.all([
      db.user.count(),
      db.post.count(),
      db.post.count({ where: { status: "PUBLISHED" } }),
      db.comment.count(),
      db.report.count({ where: { status: "PENDING" } }),
      db.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
    ]);

  return { userCount, postCount, publishedCount, commentCount, pendingReports, subscriberCount };
}

export async function getPostsPerDay(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const posts = await db.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since } },
    select: { publishedAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const post of posts) {
    if (!post.publishedAt) continue;
    const key = post.publishedAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export type AdminUserFilters = { query?: string; page?: number; pageSize?: number };

export async function getAdminUsers({ query, page = 1, pageSize = 20 }: AdminUserFilters) {
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { profile: true, _count: { select: { posts: true } } },
    }),
    db.user.count({ where }),
  ]);

  return { users, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export type AdminReportFilters = {
  status?: "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  page?: number;
  pageSize?: number;
};

export async function getAdminReports({ status = "PENDING", page = 1, pageSize = 20 }: AdminReportFilters) {
  const where: Prisma.ReportWhereInput = { status };

  const [reports, total] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
      },
    }),
    db.report.count({ where }),
  ]);

  return { reports, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export type AdminPostFilters = {
  query?: string;
  status?: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED" | "SCHEDULED";
  page?: number;
  pageSize?: number;
};

export async function getAdminPosts({ query, status, page = 1, pageSize = 20 }: AdminPostFilters) {
  const where: Prisma.PostWhereInput = {
    ...(status ? { status } : {}),
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
  };

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { author: true },
    }),
    db.post.count({ where }),
  ]);

  return { posts, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
