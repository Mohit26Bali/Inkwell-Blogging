import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Lock, BookMarked } from "lucide-react";

import { auth } from "@/server/auth";
import { getUserCollections } from "@/features/collections/services/collection.service";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";

export const metadata: Metadata = { title: "Reading lists" };

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/lists");

  const collections = await getUserCollections(session.user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Reading lists</h1>
          <p className="mt-1 text-muted-foreground">Organize articles you want to come back to.</p>
        </div>
        <CreateCollectionDialog />
      </div>

      {collections.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-border/60 px-6 py-16 text-center">
          <BookMarked className="size-6 text-muted-foreground" />
          <p className="font-medium">No lists yet</p>
          <p className="text-sm text-muted-foreground">
            Create a list to start organizing articles.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/dashboard/lists/${collection.id}`}
              className="flex items-center justify-between rounded-xl border border-border/60 p-5 transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {collection.name}
                  {collection.isPrivate && <Lock className="size-3.5 text-muted-foreground" />}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {collection._count.items} {collection._count.items === 1 ? "article" : "articles"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
