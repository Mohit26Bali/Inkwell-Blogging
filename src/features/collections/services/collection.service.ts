import "server-only";

import { db } from "@/server/db/client";

export function getUserCollections(userId: string) {
  return db.collection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function getCollectionById(collectionId: string, viewerId: string | undefined) {
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    include: {
      user: { include: { profile: true } },
      items: {
        orderBy: { addedAt: "desc" },
        include: {
          post: {
            include: {
              author: { include: { profile: true } },
              categories: { include: { category: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      },
    },
  });

  if (!collection) return null;
  if (collection.isPrivate && collection.userId !== viewerId) return null;

  return collection;
}

export async function getCollectionMembership(userId: string, postId: string) {
  const collections = await db.collection.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      items: { where: { postId }, select: { id: true } },
    },
  });

  return collections.map((c) => ({ id: c.id, name: c.name, hasPost: c.items.length > 0 }));
}
