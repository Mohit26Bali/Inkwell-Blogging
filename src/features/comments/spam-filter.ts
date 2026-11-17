import "server-only";

import { db } from "@/server/db/client";

const MAX_LINKS = 2;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const LINK_PATTERN = /(?:https?:\/\/|www\.)\S+/gi;

/** Optional comma-separated list in COMMENT_BLOCKED_TERMS (case-insensitive substring match). */
function blockedTerms(): string[] {
  return (process.env.COMMENT_BLOCKED_TERMS ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Cheap, deterministic comment-spam checks (no external service). Throws a user-facing Error when a comment
 * looks like spam:
 * - more than 2 links (the classic link-drop),
 * - a blocked term from COMMENT_BLOCKED_TERMS,
 * - the same text from the same account within 10 minutes (copy-paste flooding across posts).
 * It is a first line of defence, not a replacement for moderation (reports + admin tools).
 */
export async function assertNotSpam(
  content: string,
  authorId: string,
  { checkDuplicates = true }: { checkDuplicates?: boolean } = {}
): Promise<void> {
  const links = content.match(LINK_PATTERN)?.length ?? 0;
  if (links > MAX_LINKS) {
    throw new Error(`Comments can contain at most ${MAX_LINKS} links.`);
  }

  const lowered = normalize(content);
  if (blockedTerms().some((term) => lowered.includes(term))) {
    throw new Error("This comment can't be posted.");
  }

  if (!checkDuplicates) return; // edits legitimately resemble the comment's own earlier text

  const recent = await db.comment.findMany({
    where: { authorId, createdAt: { gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
    select: { content: true },
    take: 50,
  });
  if (recent.some((c) => normalize(c.content) === lowered)) {
    throw new Error("You already posted this comment.");
  }
}
