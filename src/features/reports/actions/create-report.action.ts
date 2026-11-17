"use server";

import { requireSession } from "@/server/auth/require-session";
import { enforceActionLimit } from "@/server/security/action-limits";
import { db } from "@/server/db/client";
import {
  createReportSchema,
  type CreateReportInput,
} from "@/features/reports/schemas/report.schema";

/** Works out, from the database, whose content a report is about — never from what the client claims. */
async function resolveReportedUserId(targetType: CreateReportInput["targetType"], targetId: string) {
  if (targetType === "POST") {
    const post = await db.post.findUnique({ where: { id: targetId }, select: { authorId: true } });
    return post?.authorId ?? null;
  }
  if (targetType === "COMMENT") {
    const comment = await db.comment.findUnique({ where: { id: targetId }, select: { authorId: true } });
    return comment?.authorId ?? null;
  }
  const user = await db.user.findUnique({ where: { id: targetId }, select: { id: true } });
  return user?.id ?? null;
}

export async function createReportAction(input: CreateReportInput) {
  const session = await requireSession("You must be signed in to report content.");
  enforceActionLimit("report", session.user.id);

  const data = createReportSchema.parse(input);

  const reportedUserId = await resolveReportedUserId(data.targetType, data.targetId);
  if (!reportedUserId) throw new Error("That content no longer exists.");
  if (reportedUserId === session.user.id) throw new Error("You can't report your own content.");

  const existing = await db.report.findFirst({
    where: {
      reporterId: session.user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      status: { in: ["PENDING", "REVIEWING"] },
    },
  });
  if (existing) throw new Error("You've already reported this.");

  await db.report.create({
    data: {
      reason: data.reason,
      detail: data.detail,
      targetType: data.targetType,
      targetId: data.targetId,
      // Derived server-side: a report can no longer be pinned on an arbitrary third user.
      reportedUserId,
      reporterId: session.user.id,
    },
  });
}
