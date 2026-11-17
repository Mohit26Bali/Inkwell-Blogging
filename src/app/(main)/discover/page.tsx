import type { Metadata } from "next";

import {
  getCategoriesWithCounts,
  getDiscoverPosts,
  type DiscoverSort,
} from "@/features/posts/services/post.service";
import { PostCard } from "@/features/posts/components/post-card";
import { DiscoverFilters } from "@/features/search/components/discover-filters";
import { ResultsPagination } from "@/components/layout/results-pagination";

export const metadata: Metadata = {
  title: "Discover",
  description: "Search and explore articles across every category on Inkwell.",
};

type DiscoverPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
};

const VALID_SORTS: DiscoverSort[] = ["newest", "trending", "most-liked"];

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const sort = VALID_SORTS.includes(params.sort as DiscoverSort)
    ? (params.sort as DiscoverSort)
    : "newest";
  const page = Math.max(1, Number(params.page) || 1);

  const [{ posts, total, pageCount }, categories] = await Promise.all([
    getDiscoverPosts({
      query: params.q,
      categorySlug: params.category,
      sort,
      page,
    }),
    getCategoriesWithCounts(),
  ]);

  function buildHref(nextPage: number) {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.category) next.set("category", params.category);
    if (sort !== "newest") next.set("sort", sort);
    if (nextPage > 1) next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/discover?${qs}` : "/discover";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">Discover</h1>
        <p className="mt-2 text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "article" : "articles"}
          {params.q && (
            <>
              {" "}
              for <span className="font-medium text-foreground">&ldquo;{params.q}&rdquo;</span>
            </>
          )}
        </p>
      </div>

      <DiscoverFilters categories={categories} />

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <p className="text-lg font-medium">No articles found</p>
          <p className="text-sm text-muted-foreground">
            Try a different search term or clear your filters.
          </p>
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
