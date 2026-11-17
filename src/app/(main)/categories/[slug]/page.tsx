import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db/client";
import { getDiscoverPosts, type DiscoverSort } from "@/features/posts/services/post.service";
import { PostCard } from "@/features/posts/components/post-card";
import { ResultsPagination } from "@/components/layout/results-pagination";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

const VALID_SORTS: DiscoverSort[] = ["newest", "trending", "most-liked"];

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const search = await searchParams;

  const category = await db.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const sort = VALID_SORTS.includes(search.sort as DiscoverSort)
    ? (search.sort as DiscoverSort)
    : "newest";
  const page = Math.max(1, Number(search.page) || 1);

  const { posts, total, pageCount } = await getDiscoverPosts({
    categorySlug: slug,
    sort,
    page,
  });

  function buildHref(nextPage: number) {
    const next = new URLSearchParams();
    if (sort !== "newest") next.set("sort", sort);
    if (nextPage > 1) next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/categories/${slug}?${qs}` : `/categories/${slug}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
        {category.name}
      </h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        {total.toLocaleString()} {total === 1 ? "article" : "articles"}
      </p>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <p className="text-lg font-medium">No articles yet</p>
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <ResultsPagination page={page} pageCount={pageCount} buildHref={buildHref} />
    </div>
  );
}
