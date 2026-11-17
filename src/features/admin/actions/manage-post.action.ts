"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PostStatus } from "@prisma/client";

import { db } from "@/server/db/client";
import { requireAdmin } from "@/features/admin/services/require-admin";

const postIdSchema = z.string().cuid();
const statusSchema = z.nativeEnum(PostStatus);

export async function updatePostStatusAction(
  postId: string,
  status: PostStatus,
) {
  const admin = await requireAdmin();
  const id = postIdSchema.parse(postId);
  const nextStatus = statusSchema.parse(status);

  const post = await db.post.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  if (!post) throw new Error("Post not found.");

  // The change and its audit entry succeed or fail together.
  await db.$transaction([
    db.post.update({
      where: { id },
      data: {
        status: nextStatus,
        // Keep the original publication date when re-publishing (it drives ordering and the RSS feed).
        publishedAt:
          nextStatus === "PUBLISHED"
            ? (post.publishedAt ?? new Date())
            : undefined,
      },
    }),
    db.auditLog.create({
      data: {
        actorId: admin.user.id,
        action: "POST_STATUS_CHANGED",
        targetType: "POST",
        targetId: id,
        metadata: { status: nextStatus },
      },
    }),
  ]);

  revalidatePath("/admin/posts");
}

export async function toggleFeaturedAction(postId: string) {
  const admin = await requireAdmin();
  const id = postIdSchema.parse(postId);

  const post = await db.post.findUnique({
    where: { id },
    select: { isFeatured: true },
  });
  if (!post) throw new Error("Post not found.");

  await db.post.update({
    where: { id },
    data: { isFeatured: !post.isFeatured },
  });
  await db.auditLog.create({
    data: {
      actorId: admin.user.id,
      action: post.isFeatured ? "POST_UNFEATURED" : "POST_FEATURED",
      targetType: "POST",
      targetId: id,
    },
  });

  revalidatePath("/admin/posts");
  revalidatePath("/");
  return { isFeatured: !post.isFeatured };
}
