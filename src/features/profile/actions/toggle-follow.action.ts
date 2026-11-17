"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import { sendFollowNotificationEmail } from "@/server/email/send";

export async function toggleFollowAction(targetUserId: string) {
  const session = await requireSession("You must be signed in to follow someone.");
  if (session.user.id === targetUserId) throw new Error("You can't follow yourself.");
  enforceActionLimit("interaction", session.user.id);

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: {
      email: true,
      name: true,
      isBanned: true,
      profile: { select: { username: true } },
      settings: { select: { emailOnFollow: true } },
    },
  });
  if (!target || target.isBanned) throw new Error("User not found.");

  // Race-safe toggle (see toggle-like.action.ts).
  const result = await db.$transaction(async (tx) => {
    const removed = await tx.follow.deleteMany({
      where: { followerId: session.user.id, followingId: targetUserId },
    });
    if (removed.count > 0) return { following: false, created: false };

    const added = await tx.follow.createMany({
      data: [{ followerId: session.user.id, followingId: targetUserId }],
      skipDuplicates: true,
    });
    if (added.count === 0) return { following: true, created: false };

    await tx.notification.create({
      data: {
        type: "FOLLOW",
        message: `${session.user.name ?? "Someone"} started following you`,
        link: session.user.username ? `/@${session.user.username}` : undefined,
        recipientId: targetUserId,
        actorId: session.user.id,
      },
    });

    return { following: true, created: true };
  });

  if (target.profile?.username) {
    revalidatePath(`/@${target.profile.username}`);
  }

  if (
    result.created &&
    target.settings?.emailOnFollow !== false &&
    session.user.username
  ) {
    await sendFollowNotificationEmail({
      to: target.email,
      recipientName: target.name ?? "there",
      followerName: session.user.name ?? "Someone",
      followerUsername: session.user.username,
    });
  }

  return { following: result.following };
}
