import Link from "next/link";

import { getCommentsForPost } from "@/features/comments/services/comment.service";
import { CommentForm } from "@/features/comments/components/comment-form";
import { CommentItem } from "@/features/comments/components/comment-item";

export async function CommentSection({
  postId,
  isAuthenticated,
  currentUserId,
}: {
  postId: string;
  isAuthenticated: boolean;
  currentUserId?: string;
}) {
  const comments = await getCommentsForPost(postId);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h2 className="mb-8 font-serif text-2xl font-medium tracking-tight">
        {comments.length > 0
          ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`
          : "Comments"}
      </h2>

      {isAuthenticated ? (
        <div className="mb-10">
          <CommentForm postId={postId} />
        </div>
      ) : (
        <p className="mb-10 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Be the first to comment.</p>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              canReply={isAuthenticated}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
