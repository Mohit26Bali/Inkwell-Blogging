import Link from "next/link";
import { Eye } from "lucide-react";

type TrendingPostData = {
  slug: string;
  title: string;
  viewCount: number;
  author: { name: string | null };
};

export function TrendingList({ posts }: { posts: TrendingPostData[] }) {
  return (
    <ol className="flex flex-col divide-y divide-border/60">
      {posts.map((post, index) => (
        <li key={post.slug} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
          <span className="font-serif text-2xl font-medium text-muted-foreground/40">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <Link href={`/articles/${post.slug}`}>
              <h4 className="line-clamp-2 font-medium leading-snug transition-colors hover:text-muted-foreground">
                {post.title}
              </h4>
            </Link>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{post.author.name}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {post.viewCount.toLocaleString()}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
