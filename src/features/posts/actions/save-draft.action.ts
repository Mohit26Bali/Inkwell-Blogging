"use server";

import readingTime from "reading-time";
import slugify from "slugify";
import type { Prisma } from "@prisma/client";

import { requireVerifiedSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import { generateUniquePostSlug } from "@/lib/slug";
import { stripHtml } from "@/lib/html";
import { saveDraftSchema, type SaveDraftInput } from "@/features/posts/schemas/post.schema";

async function syncPostTags(
  tx: Prisma.TransactionClient,
  postId: string,
  rawTags: string[] | undefined
) {
  if (rawTags === undefined) return;

  const names = Array.from(
    new Set(rawTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  ).slice(0, 10);

  const current = await tx.postTag.findMany({
    where: { postId },
    include: { tag: true },
  });
  const currentNames = new Set(current.map((pt) => pt.tag.name));
  const nextNames = new Set(names);

  const toRemove = current.filter((pt) => !nextNames.has(pt.tag.name));
  const toAdd = names.filter((name) => !currentNames.has(name));

  for (const postTag of toRemove) {
    await tx.postTag.delete({ where: { postId_tagId: { postId, tagId: postTag.tagId } } });
    await tx.tag.update({
      where: { id: postTag.tagId },
      data: { usageCount: { decrement: 1 } },
    });
  }

  for (const name of toAdd) {
    const slug = slugify(name, { lower: true, strict: true }) || name;
    const tag = await tx.tag.upsert({
      where: { name },
      update: { usageCount: { increment: 1 } },
      create: { name, slug, usageCount: 1 },
    });
    await tx.postTag.create({ data: { postId, tagId: tag.id } });
  }
}

export async function savePostDraftAction(input: SaveDraftInput) {
  const session = await requireVerifiedSession("You must be signed in to save a draft.");
  enforceActionLimit("draftSave", session.user.id);

  const { postId, title, contentHtml, contentJson, coverImage, excerpt, subtitle, tags } =
    saveDraftSchema.parse(input);

  const stats = readingTime(stripHtml(contentHtml));

  if (postId) {
    const existing = await db.post.findUnique({ where: { id: postId } });
    if (!existing || existing.authorId !== session.user.id) {
      throw new Error("Draft not found.");
    }

    return db.$transaction(async (tx) => {
      const post = await tx.post.update({
        where: { id: postId },
        data: {
          title,
          content: contentHtml,
          contentJson: contentJson as object,
          coverImage: coverImage || null,
          excerpt: excerpt || null,
          subtitle: subtitle || null,
          wordCount: stats.words,
          readingTimeMinutes: Math.max(1, Math.round(stats.minutes)),
        },
      });
      await syncPostTags(tx, postId, tags);
      return post;
    });
  }

  const slug = await generateUniquePostSlug(title);

  return db.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        title,
        slug,
        content: contentHtml,
        contentJson: contentJson as object,
        coverImage: coverImage || null,
        excerpt: excerpt || null,
        subtitle: subtitle || null,
        status: "DRAFT",
        wordCount: stats.words,
        readingTimeMinutes: Math.max(1, Math.round(stats.minutes)),
        authorId: session.user.id,
      },
    });
    await syncPostTags(tx, post.id, tags);
    return post;
  });
}
