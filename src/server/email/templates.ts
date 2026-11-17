function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:18px;font-weight:600;color:#1c1917;">Inkwell</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px 32px;color:#292524;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function welcomeEmailHtml({ name, appUrl }: { name: string; appUrl: string }): string {
  return baseLayout(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px;">Welcome to Inkwell — a place to write, publish, and find an audience for your ideas.</p>
    <p style="margin:0 0 24px;">Get started by exploring what other writers are publishing, or jump straight into drafting your first story.</p>
    <a href="${appUrl}/discover" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">Explore articles</a>
  `);
}

export function verifyEmailHtml({ name, verifyUrl }: { name: string; verifyUrl: string }): string {
  return baseLayout(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;">Confirm your email address to start publishing and commenting on Inkwell. This link works once and expires in 24 hours.</p>
    <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">Verify email</a>
    <p style="margin:24px 0 0;font-size:13px;color:#78716c;">If you didn't create an account, you can ignore this message.</p>
  `);
}

export function passwordResetEmailHtml({ name, resetUrl }: { name: string; resetUrl: string }): string {
  return baseLayout(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;">Someone asked to reset the password for your Inkwell account. Use the button below to choose a new one. The link works once and expires in 1 hour.</p>
    <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">Reset password</a>
    <p style="margin:24px 0 0;font-size:13px;color:#78716c;">If this wasn't you, ignore this email — your password stays the same.</p>
  `);
}

export function followNotificationEmailHtml({
  recipientName,
  followerName,
  followerProfileUrl,
}: {
  recipientName: string;
  followerName: string;
  followerProfileUrl: string;
}): string {
  return baseLayout(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 24px;"><strong>${escapeHtml(followerName)}</strong> just started following you on Inkwell.</p>
    <a href="${followerProfileUrl}" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">View their profile</a>
  `);
}

export function commentNotificationEmailHtml({
  recipientName,
  commenterName,
  postTitle,
  commentExcerpt,
  articleUrl,
  isReply,
}: {
  recipientName: string;
  commenterName: string;
  postTitle: string;
  commentExcerpt: string;
  articleUrl: string;
  isReply: boolean;
}): string {
  const action = isReply ? "replied to your comment on" : "commented on";
  return baseLayout(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 16px;"><strong>${escapeHtml(commenterName)}</strong> ${action} <strong>${escapeHtml(postTitle)}</strong>:</p>
    <p style="margin:0 0 24px;padding:12px 16px;background-color:#f5f5f4;border-radius:8px;color:#57534e;font-style:italic;">${escapeHtml(commentExcerpt)}</p>
    <a href="${articleUrl}" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">View comment</a>
  `);
}

export function likeNotificationEmailHtml({
  recipientName,
  likerName,
  postTitle,
  articleUrl,
}: {
  recipientName: string;
  likerName: string;
  postTitle: string;
  articleUrl: string;
}): string {
  return baseLayout(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 24px;"><strong>${escapeHtml(likerName)}</strong> liked your post <strong>${escapeHtml(postTitle)}</strong>.</p>
    <a href="${articleUrl}" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">View article</a>
  `);
}
