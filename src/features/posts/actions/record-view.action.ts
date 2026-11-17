"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIpFromForwardedFor, getTrustedProxyHops } from "@/lib/client-ip";

const HOUR = 60 * 60 * 1000;

/**
 * Counts one view of a PUBLISHED post. Deliberately cheap and hard to inflate:
 * - one view per visitor per post per hour (by trusted-proxy IP, or one shared bucket when unknown),
 * - the author's own views are not counted,
 * - drafts/archived posts are never counted.
 * Returns nothing: the browser needs no data back.
 */
export async function recordViewAction(postId: string): Promise<void> {
  const id = z.string().min(1).max(64).safeParse(postId);
  if (!id.success) return;

  const headerList = await headers();
  const ip = clientIpFromForwardedFor(headerList.get("x-forwarded-for"), getTrustedProxyHops());
  const session = await auth();
  const visitor = session?.user?.id ?? ip ?? "unknown";

  if (!checkRateLimit(`view:${id.data}:${visitor}`, { max: 1, windowMs: HOUR })) return;
  // Without a known address everyone shares one bucket above; also cap the global rate so it can't spin.
  if (!checkRateLimit("view:global", { max: 600, windowMs: 60 * 1000 })) return;

  await db.post.updateMany({
    where: {
      id: id.data,
      status: "PUBLISHED",
      ...(session?.user?.id ? { authorId: { not: session.user.id } } : {}),
    },
    data: { viewCount: { increment: 1 } },
  });
}
