import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export function HeroSection({
  stats,
}: {
  stats: { writers: number; articles: number; readers: number };
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(120,120,255,0.08),transparent_60%)]" />
      <Stagger className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <StaggerItem className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" />
          Now with AI-assisted drafting
        </StaggerItem>
        <StaggerItem>
          <h1 className="text-balance font-serif text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
            Where good writing finds its readers
          </h1>
        </StaggerItem>
        <StaggerItem>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Inkwell is a publishing platform for writers who care about craft — a distraction-free
            editor, a beautiful reading experience, and a community built to help your best work
            travel further.
          </p>
        </StaggerItem>
        <StaggerItem className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">
              Start writing
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/discover">Explore articles</Link>
          </Button>
        </StaggerItem>

        <StaggerItem>
          <dl className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-border/60 pt-10">
            <div>
              <dt className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {stats.writers.toLocaleString()}+
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">Writers</dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {stats.articles.toLocaleString()}+
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">Articles</dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {stats.readers.toLocaleString()}+
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">Monthly readers</dd>
            </div>
          </dl>
        </StaggerItem>
      </Stagger>
    </section>
  );
}
