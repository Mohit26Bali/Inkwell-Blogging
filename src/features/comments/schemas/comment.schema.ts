import { z } from "zod";

export const createCommentSchema = z.object({
  postId: z.string().cuid(),
  content: z.string().trim().min(1, "Comment can't be empty").max(5000),
  parentId: z.string().cuid().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  commentId: z.string().cuid(),
  content: z.string().trim().min(1, "Comment can't be empty").max(5000),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const deleteCommentSchema = z.object({
  commentId: z.string().cuid(),
});

export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
