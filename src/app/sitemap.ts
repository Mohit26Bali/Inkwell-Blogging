import type { MetadataRoute } from "next";

import { db } from "@/server/db/client";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  const [posts, categories, profiles] = await Promise.all([
    db.post.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.category.findMany({ select: { slug: true } }),
    db.profile.findMany({ select: { username: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/discover`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/categories`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/login`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${baseUrl}/signup`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/articles/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/categories/${category.slug}`,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const profileRoutes: MetadataRoute.Sitemap = profiles.map((profile) => ({
    url: `${baseUrl}/@${profile.username}`,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticRoutes, ...postRoutes, ...categoryRoutes, ...profileRoutes];
}
