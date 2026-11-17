import { z } from "zod";

export const createReportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "USER"]),
  targetId: z.string().cuid(),
  reportedUserId: z.string().cuid().optional(),
  reason: z.enum(["SPAM", "HARASSMENT", "MISINFORMATION", "PLAGIARISM", "NSFW", "OTHER"]),
  detail: z.string().trim().max(1000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const REPORT_REASON_LABELS: Record<CreateReportInput["reason"], string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment or abuse",
  MISINFORMATION: "Misinformation",
  PLAGIARISM: "Plagiarism",
  NSFW: "Not safe for work",
  OTHER: "Other",
};
