import { z } from "zod";

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["COLLECTION", "READING_LIST"]),
  isPrivate: z.boolean(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
