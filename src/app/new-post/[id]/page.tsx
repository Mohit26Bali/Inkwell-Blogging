import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { JSONContent } from "@tiptap/react";

import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { PostEditor } from "@/features/editor/components/post-editor";

type EditPostPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit story" };

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/new-post/${id}`);

  const post = await db.post.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });
  if (!post || post.authorId !== session.user.id) notFound();

  return (
    <PostEditor
      postId={post.id}
      initialTitle={post.title}
      initialSubtitle={post.subtitle ?? ""}
      initialCoverImage={post.coverImage ?? ""}
      initialExcerpt={post.excerpt ?? ""}
      initialTags={post.tags.map(({ tag }) => tag.name)}
      initialContent={(post.contentJson as JSONContent | null) ?? post.content}
    />
  );
}
