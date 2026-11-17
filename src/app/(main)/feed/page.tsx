import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/server/auth";
import { getFollowingFeedPosts } from "@/features/posts/services/post.service";
import { PostCard } from "@/features/posts/components/post-card";
import { ResultsPagination } from "@/components/layout/results-pagination";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Following",
  description: "Latest articles from people you follow on Inkwell.",
};

type FeedPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/feed");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { posts, total, pageCount } = await getFollowingFeedPosts(session.user.id, { page });

  function buildHref(nextPage: number) {
    return nextPage > 1 ? `/feed?page=${nextPage}` : "/feed";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">Following</h1>
        <p className="mt-2 text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "article" : "articles"} from writers you follow.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-lg font-medium">Nothing here yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Follow some writers to see their latest articles here.
          </p>
          <Button asChild className="mt-2">
            <Link href="/discover">Discover writers</Link>
          </Button>
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
