import "server-only";

import { db } from "@/server/db/client";
import type { ReportTargetType } from "@prisma/client";

export async function resolveReportTarget(targetType: ReportTargetType, targetId: string) {
  if (targetType === "POST") {
    const post = await db.post.findUnique({ where: { id: targetId }, select: { title: true, slug: true } });
    return post ? { label: post.title, href: `/articles/${post.slug}` } : null;
  }

  if (targetType === "COMMENT") {
    const comment = await db.comment.findUnique({
      where: { id: targetId },
      select: { content: true, post: { select: { slug: true } } },
    });
    return comment
      ? { label: comment.content.slice(0, 80), href: `/articles/${comment.post.slug}` }
      : null;
  }

  const user = await db.user.findUnique({
    where: { id: targetId },
    select: { name: true, profile: { select: { username: true } } },
  });
  return user
    ? { label: user.name ?? "User", href: user.profile ? `/@${user.profile.username}` : "#" }
    : null;
}
