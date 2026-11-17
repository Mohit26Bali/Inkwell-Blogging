import { z } from "zod";

/** Only http(s) URLs: `javascript:`, `data:` and similar schemes pass z.string().url() but must not be stored. */
const httpUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Use an http(s) image URL");

export const saveDraftSchema = z.object({
  postId: z.string().cuid().optional(),
  title: z.string().min(1).max(200),
  // The editor produces HTML; cap it so one request can't store megabytes per save.
  contentHtml: z.string().max(500_000),
  contentJson: z.unknown(),
  coverImage: httpUrl.optional().or(z.literal("")),
  excerpt: z.string().max(300).optional().or(z.literal("")),
  subtitle: z.string().max(200).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
});

export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

export const publishPostSchema = z.object({
  postId: z.string().cuid(),
});

export type PublishPostInput = z.infer<typeof publishPostSchema>;
