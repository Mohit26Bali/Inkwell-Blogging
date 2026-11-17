import slugify from "slugify";
import { db } from "@/server/db/client";

export async function generateUniquePostSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }) || "untitled";
  let slug = base;
  let suffix = 1;

  while (await db.post.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}
