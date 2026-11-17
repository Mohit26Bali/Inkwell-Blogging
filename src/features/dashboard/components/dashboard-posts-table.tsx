import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DashboardPost = {
  id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  updatedAt: Date;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  IN_REVIEW: "outline",
  SCHEDULED: "outline",
  ARCHIVED: "outline",
};

export function DashboardPostsTable({ posts }: { posts: DashboardPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 px-6 py-16 text-center">
        <p className="font-medium">No stories yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start writing to see your posts here.
        </p>
        <Link
          href="/new-post"
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
        >
          Write your first story
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stats</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="max-w-sm">
                <Link
                  href={post.status === "PUBLISHED" ? `/articles/${post.slug}` : `/new-post/${post.id}`}
                  className="line-clamp-1 font-medium hover:underline"
                >
                  {post.title || "Untitled"}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[post.status] ?? "outline"} className="font-normal">
                  {post.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5" />
                    {post.viewCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="size-3.5" />
                    {post.likeCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3.5" />
                    {post.commentCount.toLocaleString()}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {post.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
