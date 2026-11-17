"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import slugify from "slugify";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import {
  createCollectionSchema,
  type CreateCollectionInput,
} from "@/features/collections/schemas/collection.schema";

async function requireUser() {
  const session = await requireSession("You must be signed in.");
  return session.user;
}

export async function createCollectionAction(input: CreateCollectionInput) {
  const user = await requireUser();
  enforceActionLimit("collection", user.id);
  const { name, type, isPrivate } = createCollectionSchema.parse(input);

  const base = slugify(name, { lower: true, strict: true }) || "list";
  let slug = base;
  let suffix = 1;

  // The slug is unique per user. If two requests pick the same one at once, the database rejects the
  // loser (P2002) and we simply try the next suffix instead of failing.
  for (let attempt = 0; attempt < 10; attempt++) {
    while (await db.collection.findUnique({ where: { userId_slug: { userId: user.id, slug } } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    try {
      const collection = await db.collection.create({
        data: { userId: user.id, name, slug, type, isPrivate },
      });
      revalidatePath("/dashboard/lists");
      return collection;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        suffix += 1;
        slug = `${base}-${suffix}`;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Couldn't create the list. Please try again.");
}

export async function deleteCollectionAction(collectionId: string) {
  const user = await requireUser();
  enforceActionLimit("collection", user.id);

  const collection = await db.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== user.id) throw new Error("Collection not found.");

  await db.collection.delete({ where: { id: collectionId } });
  revalidatePath("/dashboard/lists");
}

export async function toggleCollectionItemAction(collectionId: string, postId: string) {
  const user = await requireUser();
  enforceActionLimit("interaction", user.id);

  const collection = await db.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== user.id) throw new Error("Collection not found.");

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { status: true, authorId: true },
  });
  if (!post || (post.status !== "PUBLISHED" && post.authorId !== user.id)) {
    throw new Error("Post not found.");
  }

  // Race-safe toggle (see posts/actions/toggle-like.action.ts).
  const removed = await db.collectionItem.deleteMany({ where: { collectionId, postId } });
  if (removed.count > 0) {
    revalidatePath(`/dashboard/lists/${collectionId}`);
    return { added: false };
  }

  await db.collectionItem.createMany({ data: [{ collectionId, postId }], skipDuplicates: true });
  revalidatePath(`/dashboard/lists/${collectionId}`);
  return { added: true };
}
