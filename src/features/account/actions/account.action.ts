"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { getActiveSession } from "@/server/auth/require-session";
import { allowAction } from "@/server/security/action-limits";
import { db } from "@/server/db/client";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Everything the site holds about the signed-in user, as plain JSON (GDPR-style "download my data").
 * Deliberately selects fields one by one: no password hash, tokens or other people's private data.
 */
export async function exportMyDataAction(): Promise<Result<{ data: Record<string, unknown> }>> {
  const session = await getActiveSession();
  if (!session) return { ok: false, error: "Please sign in first." };
  if (!allowAction("dataExport", session.user.id)) {
    return { ok: false, error: "You can export your data a few times per hour. Please try again later." };
  }
  const userId = session.user.id;

  const [user, posts, comments, bookmarks, following, followers, reactions, collections, reports] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        profile: { select: { username: true, bio: true, website: true, twitter: true, github: true, linkedin: true } },
        settings: true,
      },
    }),
    db.post.findMany({
      where: { authorId: userId },
      select: { title: true, slug: true, status: true, content: true, publishedAt: true, createdAt: true },
    }),
    db.comment.findMany({
      where: { authorId: userId, isDeleted: false },
      select: { content: true, createdAt: true, post: { select: { slug: true } } },
    }),
    db.bookmark.findMany({ where: { userId }, select: { createdAt: true, post: { select: { slug: true } } } }),
    db.follow.findMany({ where: { followerId: userId }, select: { following: { select: { profile: { select: { username: true } } } } } }),
    db.follow.findMany({ where: { followingId: userId }, select: { follower: { select: { profile: { select: { username: true } } } } } }),
    db.reaction.findMany({ where: { userId }, select: { type: true, post: { select: { slug: true } } } }),
    db.collection.findMany({ where: { userId }, select: { name: true } }),
    db.report.findMany({ where: { reporterId: userId }, select: { targetType: true, reason: true, detail: true, createdAt: true } }),
  ]);

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      account: user,
      posts,
      comments,
      bookmarks,
      reactions,
      collections,
      reportsFiled: reports,
      following: following.map((f) => f.following.profile?.username).filter(Boolean),
      followers: followers.map((f) => f.follower.profile?.username).filter(Boolean),
    },
  };
}

const deleteSchema = z.object({ confirmation: z.string().max(320), password: z.string().max(200).optional() });

/**
 * Permanently deletes the signed-in account and everything it owns (posts, comments, likes, bookmarks, follows,
 * notifications). Needs proof it's really them: the password for password accounts, or typing their e-mail
 * address for accounts that sign in only through Google/GitHub. Refuses for the last administrator.
 */
export async function deleteAccountAction(input: { confirmation: string; password?: string }): Promise<Result<object>> {
  const session = await getActiveSession();
  if (!session) return { ok: false, error: "Please sign in first." };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  if (!allowAction("deleteAccount", session.user.id)) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const userId = session.user.id;
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true, role: true } });
  if (!user) return { ok: false, error: "Account not found." };

  if (parsed.data.confirmation.trim().toLowerCase() !== "delete my account") {
    return { ok: false, error: 'Type "delete my account" to confirm.' };
  }
  if (user.passwordHash) {
    const okPassword = parsed.data.password ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!okPassword) return { ok: false, error: "Incorrect password." };
  }
  if (user.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN", isBanned: false } })) <= 1) {
    return { ok: false, error: "You're the only administrator. Promote someone else first." };
  }

  // Deleting the user cascades to all their rows, which would leave other people's post counters (likes,
  // comments, bookmarks) too high. Remember which posts are affected and recompute them afterwards.
  // (Follower/following numbers are counted from the follow rows, so they need no repair.)
  const [commentedOn, reactedTo, bookmarked] = await Promise.all([
    db.comment.findMany({ where: { authorId: userId }, select: { postId: true }, distinct: ["postId"] }),
    db.reaction.findMany({ where: { userId, postId: { not: null } }, select: { postId: true } }),
    db.bookmark.findMany({ where: { userId }, select: { postId: true } }),
  ]);
  const postIds = [...new Set([...commentedOn, ...reactedTo, ...bookmarked].map((r) => r.postId).filter((id): id is string => !!id))];

  await db.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: userId } });

    for (const postId of postIds) {
      const [likeCount, commentCount, bookmarkCount] = await Promise.all([
        tx.reaction.count({ where: { postId, type: "LIKE" } }),
        tx.comment.count({ where: { postId, isDeleted: false } }),
        tx.bookmark.count({ where: { postId } }),
      ]);
      await tx.post.updateMany({ where: { id: postId }, data: { likeCount, commentCount, bookmarkCount } });
    }
  });

  return { ok: true };
}
