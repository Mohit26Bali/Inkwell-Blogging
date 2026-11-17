"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "@/features/comments/components/comment-form";
import { EditCommentForm } from "@/features/comments/components/edit-comment-form";
import { CommentActionsMenu } from "@/features/comments/components/comment-actions-menu";
import { ReportDialog } from "@/features/reports/components/report-dialog";
import type { CommentWithReplies } from "@/features/comments/services/comment.service";

type ReplyComment = CommentWithReplies["replies"][number];

function CommentAuthorLink({
  author,
}: {
  author: { name: string | null; image: string | null; profile: { username: string } | null };
}) {
  const initials = (author.name ?? "U").slice(0, 2).toUpperCase();
  const href = author.profile ? `/@${author.profile.username}` : "#";

  return (
    <Link href={href} className="flex items-center gap-2">
      <Avatar className="size-8">
        <AvatarImage src={author.image ?? undefined} alt={author.name ?? ""} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium hover:underline">{author.name}</span>
    </Link>
  );
}

function ReplyItem({ reply, currentUserId }: { reply: ReplyComment; currentUserId?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const isOwner = currentUserId === reply.authorId;

  if (reply.isDeleted) {
    return (
      <div className="flex flex-col gap-1.5">
        <CommentAuthorLink author={reply.author} />
        <p className="pl-10 text-sm italic text-muted-foreground">[deleted]</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <CommentAuthorLink author={reply.author} />
        {isOwner && !isEditing && (
          <CommentActionsMenu commentId={reply.id} onEdit={() => setIsEditing(true)} />
        )}
      </div>
      {isEditing ? (
        <div className="pl-10">
          <EditCommentForm
            commentId={reply.id}
            initialContent={reply.content}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          <p className="pl-10 text-sm leading-relaxed">{reply.content}</p>
          <p className="pl-10 text-xs text-muted-foreground">
            {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
            {reply.isEdited && " · edited"}
          </p>
        </>
      )}
    </div>
  );
}

export function CommentItem({
  comment,
  postId,
  canReply,
  currentUserId,
}: {
  comment: CommentWithReplies;
  postId: string;
  canReply: boolean;
  currentUserId?: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isOwner = currentUserId === comment.authorId;

  if (comment.isDeleted) {
    return (
      <div className="flex flex-col gap-2 border-b border-border/60 py-6 last:border-none">
        <CommentAuthorLink author={comment.author} />
        <p className="pl-10 text-sm italic text-muted-foreground">[deleted]</p>
        {comment.replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-4 border-l border-border/60 pl-4">
            {comment.replies.map((reply) => (
              <ReplyItem key={reply.id} reply={reply} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border/60 py-6 last:border-none">
      <div className="flex items-center justify-between">
        <CommentAuthorLink author={comment.author} />
        {isOwner && !isEditing && (
          <CommentActionsMenu commentId={comment.id} onEdit={() => setIsEditing(true)} />
        )}
      </div>

      {isEditing ? (
        <div className="pl-10">
          <EditCommentForm
            commentId={comment.id}
            initialContent={comment.content}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          <p className="pl-10 text-sm leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-4 pl-10 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              {comment.isEdited && " · edited"}
            </span>
            {canReply && (
              <button
                type="button"
                onClick={() => setShowReplyForm((prev) => !prev)}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <MessageCircle className="size-3.5" />
                Reply
              </button>
            )}
            {currentUserId && currentUserId !== comment.authorId && (
              <ReportDialog
                targetType="COMMENT"
                targetId={comment.id}
                reportedUserId={comment.authorId}
                trigger={<button type="button" className="hover:text-foreground">Report</button>}
              />
            )}
          </div>
        </>
      )}

      {showReplyForm && (
        <div className="mt-2 pl-10">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            autoFocus
            placeholder={`Reply to ${comment.author.name}…`}
            onSuccess={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-4 border-l border-border/60 pl-4">
          {comment.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
