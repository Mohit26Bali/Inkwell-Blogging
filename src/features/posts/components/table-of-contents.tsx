"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Heading } from "@/lib/render-content";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSlug(visible.target.id);
      },
      { rootMargin: "-100px 0px -70% 0px" }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.slug);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-2 border-l border-border/60">
        {headings.map((heading) => (
          <li key={heading.slug} style={{ paddingLeft: heading.depth === 3 ? "1.75rem" : "1rem" }}>
            <a
              href={`#${heading.slug}`}
              className={cn(
                "block -ml-px border-l-2 border-transparent pl-3 py-0.5 text-muted-foreground transition-colors hover:text-foreground",
                activeSlug === heading.slug && "border-foreground text-foreground"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
