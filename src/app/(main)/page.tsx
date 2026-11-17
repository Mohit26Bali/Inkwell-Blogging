import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { db } from "@/server/db/client";
import { auth } from "@/server/auth";
import {
  getCategoriesWithCounts,
  getFeaturedPosts,
  getFeaturedWriters,
  getLatestPosts,
  getTrendingPosts,
} from "@/features/posts/services/post.service";
import { getFollowingIds } from "@/features/profile/services/profile.service";
import { PostCard } from "@/features/posts/components/post-card";
import { HeroSection } from "@/features/posts/components/hero-section";
import { NewsletterSection } from "@/features/posts/components/newsletter-section";
import { CategoryGrid } from "@/features/posts/components/category-grid";
import { WriterCard } from "@/features/posts/components/writer-card";
import { TrendingList } from "@/features/posts/components/trending-list";
import { SectionHeader } from "@/components/layout/section-header";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  const [featured, latest, trending, categories, writers, writerCount, postCount] =
    await Promise.all([
      getFeaturedPosts(3),
      getLatestPosts(6),
      getTrendingPosts(5),
      getCategoriesWithCounts(),
      getFeaturedWriters(4),
      db.user.count({ where: { role: { in: ["WRITER", "ADMIN"] } } }),
      db.post.count({ where: { status: "PUBLISHED" } }),
    ]);

  const followingIds = await getFollowingIds(
    session?.user?.id,
    writers.map((w) => w.id)
  );

  return (
    <>
      <HeroSection stats={{ writers: writerCount, articles: postCount, readers: 42000 }} />

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeader
              title="Featured stories"
              description="Hand-picked by our editors this week."
              href="/discover"
            />
          </Reveal>
          <Stagger className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((post) => (
              <StaggerItem key={post.id}>
                <PostCard post={post} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <section className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Reveal>
              <SectionHeader title="Latest articles" href="/discover" />
            </Reveal>
            <Stagger className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
              {latest.map((post) => (
                <StaggerItem key={post.id}>
                  <PostCard post={post} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <Reveal delay={0.1}>
            <SectionHeader title="Trending now" />
            <TrendingList posts={trending} />
          </Reveal>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeader title="Popular categories" description="Explore articles by topic." />
          </Reveal>
          <CategoryGrid categories={categories} />
        </section>
      )}

      {writers.length > 0 && (
        <section className="border-t border-border/60 bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal>
              <SectionHeader title="Featured writers" description="People worth following." />
            </Reveal>
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {writers.map((writer) => (
                <StaggerItem key={writer.id}>
                  <WriterCard
                    writer={writer}
                    isFollowing={followingIds.has(writer.id)}
                    isAuthenticated={Boolean(session?.user)}
                    isSelf={session?.user?.id === writer.id}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      <Reveal>
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-medium tracking-tight">
            Ready to share your ideas?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Join Inkwell today and start building an audience for your writing.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/signup">
              Create your account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </Reveal>

      <NewsletterSection />
    </>
  );
}
