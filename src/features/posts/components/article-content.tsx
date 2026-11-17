"use client";

import { useRef } from "react";

import { CodeCopyEnhancer } from "@/features/posts/components/code-copy-enhancer";

export function ArticleContent({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-headings:scroll-mt-24 prose-p:font-serif prose-p:text-[1.0625rem] prose-p:leading-[1.8] prose-li:font-serif prose-a:font-medium prose-a:underline-offset-4 prose-img:rounded-xl prose-pre:bg-transparent prose-pre:p-0"
    >
      {/* html is sanitized server-side via rehype-sanitize before reaching this component */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CodeCopyEnhancer containerRef={containerRef} />
    </div>
  );
}
