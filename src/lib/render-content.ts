import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "img"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "id"],
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
    img: ["src", "alt", "width", "height"],
  },
};

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSlug)
  .use(rehypeSanitize, schema)
  .use(rehypeHighlight)
  .use(rehypeStringify);

/** Sanitizes and syntax-highlights editor-produced HTML for safe rendering with dangerouslySetInnerHTML. */
export async function renderPostHtml(rawHtml: string): Promise<string> {
  const file = await processor.process(rawHtml);
  return String(file);
}

export type Heading = { depth: 2 | 3; text: string; slug: string };

/** Extracts TOC entries from already-rendered (slugged) HTML. */
export function extractHeadingsFromHtml(html: string): Heading[] {
  const headingPattern = /<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings: Heading[] = [];

  for (const match of html.matchAll(headingPattern)) {
    const depth = Number(match[1]) as 2 | 3;
    const slug = match[2];
    const text = match[3].replace(/<[^>]+>/g, "").trim();
    if (text) headings.push({ depth, slug, text });
  }

  return headings;
}
