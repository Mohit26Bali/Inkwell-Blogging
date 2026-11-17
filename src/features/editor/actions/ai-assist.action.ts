"use server";

import { z } from "zod";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { generateCompletion } from "@/server/ai/client";
import { stripHtml } from "@/lib/html";

const contentInputSchema = z.object({
  title: z.string().max(200).optional(),
  // Capped: the text is truncated to 600 words before it reaches the model anyway.
  contentHtml: z.string().min(1, "Write a little content first.").max(200_000),
});

/** Each call costs money (Groq API), so it needs a live account and is rate limited per user. */
async function requireUser() {
  const session = await requireSession("You must be signed in to use AI assist.");
  enforceActionLimit("aiAssist", session.user.id, "You've used a lot of AI suggestions. Try again later.");
}

function truncateWords(text: string, maxWords = 600): string {
  const words = text.split(/\s+/);
  return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "…" : text;
}

export async function suggestTitlesAction(input: z.infer<typeof contentInputSchema>) {
  await requireUser();
  const { contentHtml } = contentInputSchema.parse(input);

  const plainText = truncateWords(stripHtml(contentHtml));
  if (plainText.length < 20) throw new Error("Write a bit more before generating titles.");

  const raw = await generateCompletion({
    system:
      "You are an editor for a writing platform. Suggest concise, specific, non-clickbait blog post titles based on the article draft the user gives you. Reply with exactly 4 titles, one per line, no numbering, no quotes, no extra commentary.",
    prompt: `Draft content:\n\n${plainText}`,
    maxTokens: 300,
  });

  const titles = raw
    .split("\n")
    .map((line) => line.replace(/^[\d.\-*"'\s]+/, "").replace(/["']+$/, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  if (titles.length === 0) throw new Error("AI didn't return any usable titles — try again.");
  return { titles };
}

export async function generateExcerptAction(input: z.infer<typeof contentInputSchema>) {
  await requireUser();
  const { title, contentHtml } = contentInputSchema.parse(input);

  const plainText = truncateWords(stripHtml(contentHtml));
  if (plainText.length < 20) throw new Error("Write a bit more before generating an excerpt.");

  const raw = await generateCompletion({
    system:
      "You write short, compelling excerpts/meta descriptions for blog articles — the kind shown on a card preview or in search results. Reply with exactly one excerpt, 1-2 sentences, under 200 characters, no quotes, no commentary, no title restatement.",
    prompt: `Title: ${title ?? "(untitled)"}\n\nDraft content:\n\n${plainText}`,
    maxTokens: 150,
  });

  const excerpt = raw.replace(/^["']|["']$/g, "").trim().slice(0, 300);
  return { excerpt };
}

export async function suggestTagsAction(input: z.infer<typeof contentInputSchema>) {
  await requireUser();
  const { title, contentHtml } = contentInputSchema.parse(input);

  const plainText = truncateWords(stripHtml(contentHtml));
  if (plainText.length < 20) throw new Error("Write a bit more before generating tags.");

  const raw = await generateCompletion({
    system:
      "You suggest topical tags for a blog post, the kind used to categorize and discover articles. Reply with exactly 5 short tags (1-3 words each), comma-separated, lowercase, no hashtags, no numbering, no commentary.",
    prompt: `Title: ${title ?? "(untitled)"}\n\nDraft content:\n\n${plainText}`,
    maxTokens: 100,
  });

  const tags = raw
    .split(",")
    .map((tag) => tag.replace(/^[\d.\-*"'#\s]+/, "").replace(/["']+$/, "").trim())
    .filter((tag) => tag.length > 0 && tag.length <= 50)
    .slice(0, 5);

  if (tags.length === 0) throw new Error("AI didn't return any usable tags — try again.");
  return { tags };
}
