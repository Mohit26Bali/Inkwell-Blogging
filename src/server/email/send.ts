import "server-only";

import { getResend, EMAIL_FROM } from "@/server/email/client";
import {
  welcomeEmailHtml,
  verifyEmailHtml,
  passwordResetEmailHtml,
  followNotificationEmailHtml,
  commentNotificationEmailHtml,
  likeNotificationEmailHtml,
} from "@/server/email/templates";
import { env } from "@/lib/env";

let warnedAboutMissingKey = false;

/**
 * Sends one message. Best-effort: e-mail delivery never blocks or fails the caller's primary action,
 * a missing RESEND_API_KEY just skips sending, and nothing sensitive (recipient, body, key) is logged.
 * Resend reports most problems (e.g. a rejected recipient on the sandbox sender) as a returned `error`
 * rather than an exception, so that is checked too.
 */
async function deliver(label: string, message: { to: string; subject: string; html: string }) {
  // Automated tests must never send real mail, even if a developer's .env contains a key.
  if (process.env.NODE_ENV === "test" && process.env.ALLOW_EMAIL_IN_TESTS !== "1") return;

  const resend = getResend();
  if (!resend) {
    if (!warnedAboutMissingKey) {
      warnedAboutMissingKey = true;
      console.warn("[email] RESEND_API_KEY is not set — notification e-mails are skipped.");
    }
    return;
  }

  try {
    const { error } = await resend.emails.send({ from: EMAIL_FROM, ...message });
    if (error) console.error(`[email] ${label} e-mail was rejected (${error.name ?? "error"}).`);
  } catch {
    console.error(`[email] ${label} e-mail could not be sent.`);
  }
}

export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  await deliver("welcome", {
    to,
    subject: "Welcome to Inkwell",
    html: welcomeEmailHtml({ name, appUrl: env.NEXT_PUBLIC_APP_URL }),
  });
}

export async function sendVerificationEmail({
  to,
  name,
  token,
}: {
  to: string;
  name: string;
  token: string;
}) {
  await deliver("verification", {
    to,
    subject: "Verify your email for Inkwell",
    html: verifyEmailHtml({
      name,
      verifyUrl: `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`,
    }),
  });
}

export async function sendPasswordResetEmail({ to, name, token }: { to: string; name: string; token: string }) {
  await deliver("password-reset", {
    to,
    subject: "Reset your Inkwell password",
    html: passwordResetEmailHtml({ name, resetUrl: `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}` }),
  });
}

export async function sendFollowNotificationEmail({
  to,
  recipientName,
  followerName,
  followerUsername,
}: {
  to: string;
  recipientName: string;
  followerName: string;
  followerUsername: string;
}) {
  await deliver("follow", {
    to,
    subject: `${followerName} started following you on Inkwell`,
    html: followNotificationEmailHtml({
      recipientName,
      followerName,
      followerProfileUrl: `${env.NEXT_PUBLIC_APP_URL}/@${followerUsername}`,
    }),
  });
}

export async function sendCommentNotificationEmail({
  to,
  recipientName,
  commenterName,
  postTitle,
  commentExcerpt,
  articleSlug,
  isReply,
}: {
  to: string;
  recipientName: string;
  commenterName: string;
  postTitle: string;
  commentExcerpt: string;
  articleSlug: string;
  isReply: boolean;
}) {
  await deliver("comment", {
    to,
    subject: `${commenterName} ${isReply ? "replied to your comment on" : "commented on"} "${postTitle}"`,
    html: commentNotificationEmailHtml({
      recipientName,
      commenterName,
      postTitle,
      commentExcerpt,
      articleUrl: `${env.NEXT_PUBLIC_APP_URL}/articles/${articleSlug}`,
      isReply,
    }),
  });
}

export async function sendLikeNotificationEmail({
  to,
  recipientName,
  likerName,
  postTitle,
  articleSlug,
}: {
  to: string;
  recipientName: string;
  likerName: string;
  postTitle: string;
  articleSlug: string;
}) {
  await deliver("like", {
    to,
    subject: `${likerName} liked your post "${postTitle}"`,
    html: likeNotificationEmailHtml({
      recipientName,
      likerName,
      postTitle,
      articleUrl: `${env.NEXT_PUBLIC_APP_URL}/articles/${articleSlug}`,
    }),
  });
}
