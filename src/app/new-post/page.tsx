import type { Metadata } from "next";

import { PostEditor } from "@/features/editor/components/post-editor";

export const metadata: Metadata = {
  title: "Write a new story",
};

export default function NewPostPage() {
  return <PostEditor />;
}
