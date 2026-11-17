import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/server/auth";
import { getCollectionById } from "@/features/collections/services/collection.service";
import { PostCard } from "@/features/posts/components/post-card";
import { RemoveFromListButton } from "@/features/collections/components/remove-from-list-button";
import { DeleteListButton } from "@/features/collections/components/delete-list-button";
import { Badge } from "@/components/ui/badge";

type ListDetailPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ListDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const collection = await getCollectionById(id, session?.user?.id);
  return { title: collection?.name ?? "Reading list" };
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const collection = await getCollectionById(id, session?.user?.id);

  if (!collection) notFound();

  const isOwner = collection.userId === session?.user?.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-medium tracking-tight">{collection.name}</h1>
            {collection.isPrivate && (
              <Badge variant="secondary" className="font-normal">
                Private
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            {collection.items.length} {collection.items.length === 1 ? "article" : "articles"} ·
            curated by {collection.user.name}
          </p>
        </div>
        {isOwner && <DeleteListButton collectionId={collection.id} />}
      </div>

      {collection.items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-border/60 px-6 py-16 text-center text-muted-foreground">
          <p>No articles saved to this list yet.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {collection.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3">
              <PostCard post={item.post} />
              {isOwner && (
                <RemoveFromListButton collectionId={collection.id} postId={item.postId} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
