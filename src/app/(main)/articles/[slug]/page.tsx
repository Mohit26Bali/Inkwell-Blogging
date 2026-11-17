import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, CalendarDays } from "lucide-react";

import { auth } from "@/server/auth";
import {
  getPostBySlug,
  getRelatedPosts,
  getViewerPostState,
} from "@/features/posts/services/post.service";
import { getCollectionMembership } from "@/features/collections/services/collection.service";
import { renderPostHtml, extractHeadingsFromHtml } from "@/lib/render-content";
import { serializeJsonLd } from "@/lib/json-ld";
import { ArticleContent } from "@/features/posts/components/article-content";
import { TableOfContents } from "@/features/posts/components/table-of-contents";
import { AuthorCard } from "@/features/posts/components/author-card";
import { ArticleActions } from "@/features/posts/components/article-actions";
import { ReadingProgressBar } from "@/features/posts/components/reading-progress-bar";
import { ViewTracker } from "@/features/posts/components/view-tracker";
import { PostCard } from "@/features/posts/components/post-card";
import { CommentSection } from "@/features/comments/components/comment-section";
import { SaveToListMenu } from "@/features/collections/components/save-to-list-menu";
import { ReportDialog } from "@/features/reports/components/report-dialog";
import { SectionHeader } from "@/components/layout/section-header";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Badge } from "@/components/ui/badge";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  // Drafts/archived posts render a 404, so their title, description and cover must not leak through the
  // page <head> either (slugs are derived from titles, so they are easy to guess).
  if (!post || post.status !== "PUBLISHED") return {};

  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    alternates: { canonical: post.canonicalUrl ?? `/articles/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      images: post.coverImage ? [post.coverImage] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.status !== "PUBLISHED") notFound();

  const renderedHtml = await renderPostHtml(post.content);
  const headings = extractHeadingsFromHtml(renderedHtml);
  const categoryIds = post.categories.map((c) => c.categoryId);
  const session = await auth();
  const [related, viewerState, listMembership] = await Promise.all([
    getRelatedPosts(post.id, categoryIds),
    getViewerPostState(session?.user?.id, post.id),
    session?.user ? getCollectionMembership(session.user.id, post.id) : Promise.resolve([]),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.author.name },
  };

  return (
    <>
      <ReadingProgressBar />
      <ViewTracker postId={post.id} />
      <script
        type="application/ld+json"
        // serializeJsonLd escapes "<" etc.: a title or author name like `</script><script>…` would otherwise
        // close this tag and run as script for every reader.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6">
        <Stagger>
          <header className="mb-10">
            <StaggerItem className="mb-5 flex flex-wrap gap-2">
              {post.categories.map(({ category }) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <Badge variant="secondary" className="font-normal">
                    {category.name}
                  </Badge>
                </Link>
              ))}
            </StaggerItem>

            <StaggerItem>
              <h1 className="text-balance font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                {post.title}
              </h1>
            </StaggerItem>

            {post.subtitle && (
              <StaggerItem>
                <p className="mt-4 text-balance font-serif text-xl text-muted-foreground">
                  {post.subtitle}
                </p>
              </StaggerItem>
            )}

            <StaggerItem className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-border/60 py-4">
              <AuthorCard author={post.author} />
              <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {post.publishedAt?.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {post.readingTimeMinutes} min read
                </span>
              </div>
            </StaggerItem>
          </header>
        </Stagger>

        {post.coverImage && (
          <Reveal>
            <div className="relative mb-10 aspect-16/9 overflow-hidden rounded-2xl bg-muted">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                priority
                className="object-cover"
                sizes="768px"
              />
            </div>
          </Reveal>
        )}

        {headings.length > 0 && (
          <div className="mb-10 lg:hidden">
            <TableOfContents headings={headings} />
          </div>
        )}

        <Reveal>
          <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-12">
            <ArticleContent html={renderedHtml} />

            {headings.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <TableOfContents headings={headings} />
                </div>
              </aside>
            )}
          </div>
        </Reveal>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-8">
          <div className="flex flex-wrap gap-2">
            {post.tags.map(({ tag }) => (
              <Badge key={tag.id} variant="outline" className="font-normal">
                #{tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ArticleActions
              postId={post.id}
              initialLikeCount={post.likeCount}
              initialLiked={viewerState.liked}
              initialBookmarked={viewerState.bookmarked}
              isAuthenticated={Boolean(session?.user)}
            />
            {session?.user && (
              <SaveToListMenu postId={post.id} lists={listMembership} isAuthenticated />
            )}
            {session?.user && session.user.id !== post.authorId && (
              <ReportDialog targetType="POST" targetId={post.id} reportedUserId={post.authorId} />
            )}
          </div>
        </div>
      </article>

      <div className="border-t border-border/60">
        <Reveal>
          <CommentSection
            postId={post.id}
            isAuthenticated={Boolean(session?.user)}
            currentUserId={session?.user?.id}
          />
        </Reveal>
      </div>

      {related.length > 0 && (
        <section className="border-t border-border/60 bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal>
              <SectionHeader title="Related articles" />
            </Reveal>
            <Stagger className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((relatedPost) => (
                <StaggerItem key={relatedPost.id}>
                  <PostCard post={relatedPost} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}
    </>
  );
}
