import Link from "next/link";
import type { Metadata } from "next";

import { getAdminPosts, type AdminPostFilters } from "@/features/admin/services/admin.service";
import { PostStatusSelect } from "@/features/admin/components/post-status-select";
import { FeaturedToggleButton } from "@/features/admin/components/featured-toggle-button";
import { StatusFilterSelect } from "@/features/admin/components/status-filter-select";
import { ResultsPagination } from "@/components/layout/results-pagination";
import { AdminSearchInput } from "@/features/admin/components/admin-search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Manage posts" };

type PostsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

const STATUS_FILTERS: NonNullable<AdminPostFilters["status"]>[] = [
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
  "SCHEDULED",
];

export default async function AdminPostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = STATUS_FILTERS.includes(params.status as never)
    ? (params.status as AdminPostFilters["status"])
    : undefined;

  const { posts, total, pageCount } = await getAdminPosts({ query: params.q, status, page });

  function buildHref(nextPage: number) {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (status) next.set("status", status);
    if (nextPage > 1) next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/admin/posts?${qs}` : "/admin/posts";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Posts</h1>
          <p className="mt-1 text-muted-foreground">{total.toLocaleString()} total posts</p>
        </div>
        <div className="flex gap-3">
          <StatusFilterSelect statuses={STATUS_FILTERS} currentStatus={status} />
          <AdminSearchInput basePath="/admin/posts" placeholder="Search posts…" />
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="text-right">Featured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="max-w-xs">
                  <Link
                    href={`/articles/${post.slug}`}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {post.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{post.author.name}</TableCell>
                <TableCell>
                  <PostStatusSelect postId={post.id} status={post.status} />
                </TableCell>
                <TableCell>{post.viewCount.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <FeaturedToggleButton postId={post.id} isFeatured={post.isFeatured} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ResultsPagination page={page} pageCount={pageCount} buildHref={buildHref} />
    </div>
  );
}
