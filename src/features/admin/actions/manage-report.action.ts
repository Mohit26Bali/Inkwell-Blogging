"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ReportStatus } from "@prisma/client";

import { db } from "@/server/db/client";
import { requireAdmin } from "@/features/admin/services/require-admin";

const inputSchema = z.object({
  reportId: z.string().cuid(),
  status: z.nativeEnum(ReportStatus),
  resolutionNote: z.string().trim().max(1000).optional(),
});

export async function updateReportStatusAction(
  reportId: string,
  status: ReportStatus,
  resolutionNote?: string,
) {
  const admin = await requireAdmin();
  const parsed = inputSchema.parse({ reportId, status, resolutionNote });

  // The change and its audit entry succeed or fail together.
  await db.$transaction([
    db.report.update({
      where: { id: parsed.reportId },
      data: {
        status: parsed.status,
        resolutionNote: parsed.resolutionNote,
        resolvedAt:
          parsed.status === "RESOLVED" || parsed.status === "DISMISSED"
            ? new Date()
            : null,
      },
    }),
    db.auditLog.create({
      data: {
        actorId: admin.user.id,
        action: "REPORT_STATUS_CHANGED",
        targetType: "REPORT",
        targetId: parsed.reportId,
        metadata: { status: parsed.status },
      },
    }),
  ]);

  revalidatePath("/admin/reports");
}
