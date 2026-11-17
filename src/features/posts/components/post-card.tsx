import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type PostCardData = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  readingTimeMinutes: number;
  publishedAt: Date | null;
  author: {
    name: string | null;
    image: string | null;
    profile: { username: string } | null;
  };
  categories: { category: { name: string; slug: string } }[];
};

export function PostCard({ post }: { post: PostCardData }) {
  const authorInitials = (post.author.name ?? "U").slice(0, 2).toUpperCase();
  const category = post.categories[0]?.category;

  return (
    <article className="group flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-1">
      <Link
        href={`/articles/${post.slug}`}
        className="relative aspect-16/10 overflow-hidden rounded-xl bg-muted shadow-none transition-shadow duration-300 group-hover:shadow-lg"
      >
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 380px, 100vw"
          />
        )}
      </Link>

      <div className="flex flex-col gap-2.5">
        {category && (
          <Link href={`/categories/${category.slug}`}>
            <Badge variant="secondary" className="w-fit font-normal">
              {category.name}
            </Badge>
          </Link>
        )}

        <Link href={`/articles/${post.slug}`}>
          <h3 className="text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-muted-foreground">
            {post.title}
          </h3>
        </Link>

        {post.excerpt && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
        )}

        <div className="mt-1 flex items-center gap-2.5">
          <Avatar className="size-6">
            <AvatarImage src={post.author.image ?? undefined} alt={post.author.name ?? ""} />
            <AvatarFallback className="text-[10px]">{authorInitials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{post.author.name}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {post.readingTimeMinutes} min read
          </span>
        </div>
      </div>
    </article>
  );
}
