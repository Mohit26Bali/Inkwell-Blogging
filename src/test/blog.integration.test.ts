// Integration tests: call the REAL Server Actions against a throwaway PostgreSQL database
// (created and dropped by test-db.ts). Skipped automatically if PostgreSQL is not reachable.
// `auth()` is mocked: it returns whatever session setSession() was given, like a (possibly stale) JWT.
// Run: npx vitest run src/test/blog.integration.test.ts
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createTestDatabase } from "./test-db";
import * as nx from "./next-mocks";

vi.mock("next/headers", async () => {
  const m = await import("./next-mocks");
  return { headers: m.headers };
});
vi.mock("next/cache", async () => {
  const m = await import("./next-mocks");
  return { revalidatePath: m.revalidatePath };
});
vi.mock("next/navigation", async () => {
  const m = await import("./next-mocks");
  return { redirect: m.redirect, notFound: m.notFound };
});
vi.mock("@/server/auth", async () => {
  const m = await import("./next-mocks");
  return { auth: m.auth, handlers: m.handlers, signIn: m.signIn, signOut: m.signOut };
});
// No real e-mail from tests; the mocks also let us count what WOULD have been sent.
vi.mock("@/server/email/send", () => ({
  sendWelcomeEmail: vi.fn(async () => undefined),
  sendVerificationEmail: vi.fn(async () => undefined),
  sendPasswordResetEmail: vi.fn(async () => undefined),
  sendFollowNotificationEmail: vi.fn(async () => undefined),
  sendCommentNotificationEmail: vi.fn(async () => undefined),
  sendLikeNotificationEmail: vi.fn(async () => undefined),
}));
vi.mock("@/server/ai/client", () => ({
  generateCompletion: vi.fn(async () => "Alpha title\nBeta title\nGamma title\nDelta title"),
}));

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });
process.env.AUTH_SECRET ||= "test-secret-test-secret-test-secret-123";
process.env.RESEND_API_KEY = "";
process.env.TRUSTED_PROXY_HOPS = "1";

const testDb = await createTestDatabase().catch((error) => {
  console.warn("Integration tests skipped:", (error as Error).message);
  return null;
});

// IMPORTANT: modules that create the Prisma client are imported only AFTER DATABASE_URL points at the
// throwaway database (static imports would run first and could touch the development database).
async function loadModules() {
  const [db, signup, draft, publish, like, createComment, updateComment, deleteComment, bookmark, follow, collection, report, notif, ai, adminPost, adminUser, adminReport, render, authConfigMod, emailSend, rss, ev, view, account, reset, reqSession, pwVersion] =
    await Promise.all([
      import("@/server/db/client"),
      import("@/features/auth/actions/signup.action"),
      import("@/features/posts/actions/save-draft.action"),
      import("@/features/posts/actions/publish-post.action"),
      import("@/features/posts/actions/toggle-like.action"),
      import("@/features/comments/actions/create-comment.action"),
      import("@/features/comments/actions/update-comment.action"),
      import("@/features/comments/actions/delete-comment.action"),
      import("@/features/bookmarks/actions/toggle-bookmark.action"),
      import("@/features/profile/actions/toggle-follow.action"),
      import("@/features/collections/actions/collection.action"),
      import("@/features/reports/actions/create-report.action"),
      import("@/features/notifications/actions/mark-read.action"),
      import("@/features/editor/actions/ai-assist.action"),
      import("@/features/admin/actions/manage-post.action"),
      import("@/features/admin/actions/manage-user.action"),
      import("@/features/admin/actions/manage-report.action"),
      import("@/lib/render-content"),
      import("@/server/auth/config"),
      import("@/server/email/send"),
      import("@/app/rss.xml/route"),
      import("@/server/auth/email-verification"),
      import("@/features/posts/actions/record-view.action"),
      import("@/features/account/actions/account.action"),
      import("@/features/auth/actions/password-reset.action"),
      import("@/server/auth/require-session"),
      import("@/server/auth/password-version"),
    ]);
  return { db: db.db, signup, draft, publish, like, createComment, updateComment, deleteComment, bookmark, follow, collection, report, notif, ai, adminPost, adminUser, adminReport, render, authConfig: authConfigMod.authConfig, emailSend, rss, ev, view, account, reset, reqSession, pwVersion };
}

const M = testDb ? await loadModules() : null;
const suite = M ? describe : describe.skip;

const PASSWORD = "Str0ngPassw0rd";
type Role = "READER" | "WRITER" | "ADMIN";

suite("Inkwell — real flows on a throwaway database", () => {
  const m = M!;
  const db = m.db;
  let seq = 0;
  let passwordHash = "";

  beforeAll(async () => {
    const bcrypt = (await import("bcryptjs")).default;
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });
  afterAll(async () => {
    await db.$disconnect();
    await testDb!.drop();
  });

  // ---------- helpers ----------
  async function makeUser(role: Role = "READER", extra: Record<string, unknown> = {}) {
    seq += 1;
    const user = await db.user.create({
      data: {
        name: `Test User ${seq}`,
        email: `user${seq}@test.example`,
        passwordHash,
        role,
        profile: { create: { username: `user-${seq}` } },
        settings: { create: {} },
        ...extra,
      },
      include: { profile: true },
    });
    return user;
  }
  /** Signs in as `user` (the mocked JWT carries the role it had at sign-in). */
  function signInAs(user: { id: string; name: string | null; email: string; role: string; profile?: { username: string } | null }, roleOverride?: string) {
    nx.setSession({ id: user.id, name: user.name, email: user.email, role: roleOverride ?? user.role, username: user.profile?.username ?? null });
    nx.setClientIp(`10.1.${seq % 250}.${(seq * 7) % 250}`);
  }
  async function makePost(authorId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED" = "PUBLISHED", extra: Record<string, unknown> = {}) {
    seq += 1;
    return db.post.create({
      data: {
        title: `Post ${seq}`,
        slug: `post-${seq}-${crypto.randomUUID().slice(0, 6)}`,
        content: "<p>Hello world, this is a reasonably long body of text for testing.</p>",
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        authorId,
        ...extra,
      },
    });
  }
  const credentialsAuthorize = () => {
    const provider = m.authConfig.providers[0] as unknown as { authorize?: (c: unknown) => Promise<unknown>; options?: { authorize?: (c: unknown) => Promise<unknown> } };
    // NextAuth v5's Credentials() puts a placeholder `authorize` (always null) at the top level and the
    // real one from our config under `options`.
    const fn = provider.options?.authorize ?? provider.authorize;
    if (!fn) throw new Error("credentials authorize() not found");
    return fn;
  };
  const rejects = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return false;
    } catch {
      return true;
    }
  };

  // ====================================================================
  describe("accounts and sign-in", () => {
    it("signup creates user + profile + settings with a hashed password; duplicates are rejected", async () => {
      nx.setSession(null);
      nx.setClientIp("10.9.0.1");
      const r = await m.signup.signupAction({ name: "Sam Writer", username: "sam-writer", email: "sam@test.example", password: PASSWORD });
      expect(r).toEqual({ success: true });
      const user = await db.user.findUniqueOrThrow({ where: { email: "sam@test.example" }, include: { profile: true, settings: true } });
      expect(user.role).toBe("READER");
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(user.passwordHash).not.toContain(PASSWORD);
      expect(user.profile?.username).toBe("sam-writer");
      expect(user.settings).not.toBeNull();

      expect(await m.signup.signupAction({ name: "Other", username: "other-name", email: "sam@test.example", password: PASSWORD })).toMatchObject({ success: false });
      expect(await m.signup.signupAction({ name: "Other", username: "sam-writer", email: "other@test.example", password: PASSWORD })).toMatchObject({ success: false });
      expect(await m.signup.signupAction({ name: "Weak", username: "weak-one", email: "weak@test.example", password: "password123" })).toMatchObject({ success: false });
    });

    it("credentials login: right password works, wrong password / unknown user / banned user do not", async () => {
      const authorize = credentialsAuthorize();
      const user = await makeUser();
      expect(await authorize({ email: user.email, password: PASSWORD })).toMatchObject({ id: user.id, role: "READER" });
      expect(await authorize({ email: user.email, password: "WrongPassw0rd" })).toBeNull();
      expect(await authorize({ email: "nobody@test.example", password: PASSWORD })).toBeNull();
      const banned = await makeUser("READER", { isBanned: true });
      expect(await authorize({ email: banned.email, password: PASSWORD })).toBeNull();
    });

    it("[regression] e-mail addresses are case-insensitive (no duplicate accounts, login works in any case)", async () => {
      const authorize = credentialsAuthorize();
      nx.setSession(null);
      nx.setClientIp("10.9.0.2");
      expect(await m.signup.signupAction({ name: "Case One", username: "case-one", email: "case@test.example", password: PASSWORD })).toEqual({ success: true });
      const dup = await m.signup.signupAction({ name: "Case Two", username: "case-two", email: "CASE@Test.Example", password: PASSWORD });
      expect(dup).toMatchObject({ success: false });
      expect(await db.user.count({ where: { email: { equals: "case@test.example", mode: "insensitive" } } })).toBe(1);
      expect(await authorize({ email: "Case@TEST.example", password: PASSWORD })).toMatchObject({ role: "READER" });
    });

    it("[regression] OAuth sign-in is blocked for banned users and creates a profile for new users", async () => {
      const cfg = m.authConfig as unknown as {
        callbacks: { signIn?: (p: unknown) => Promise<boolean | string> };
        adapter: { createUser: (u: Record<string, unknown>) => Promise<{ id: string }> };
      };
      const banned = await makeUser("READER", { isBanned: true });
      expect(cfg.callbacks.signIn).toBeTypeOf("function");
      expect(await cfg.callbacks.signIn!({ user: { id: banned.id, email: banned.email }, account: { provider: "github" } })).toBe(false);
      const ok = await makeUser();
      expect(await cfg.callbacks.signIn!({ user: { id: ok.id, email: ok.email }, account: { provider: "github" } })).not.toBe(false);

      const created = await cfg.adapter.createUser({ email: "oauth.person@test.example", name: "Oauth Person", image: null, emailVerified: null });
      const row = await db.user.findUniqueOrThrow({ where: { id: created.id }, include: { profile: true, settings: true } });
      expect(row.profile?.username).toMatch(/^[a-z0-9_-]{3,30}$/);
      expect(row.settings).not.toBeNull();
    });
  });

  // ====================================================================
  describe("writing and publishing", () => {
    it("draft → edit → publish works for the author, with tags, reading time and a unique slug", async () => {
      const author = await makeUser("WRITER");
      signInAs(author);
      const body = "<p>" + "word ".repeat(300) + "</p>";
      const d1 = await m.draft.savePostDraftAction({ title: "My First Story", contentHtml: body, contentJson: { type: "doc" }, tags: ["React ", "next-js", "react"] });
      expect(d1.status).toBe("DRAFT");
      expect(d1.slug).toBe("my-first-story");
      expect(d1.wordCount).toBeGreaterThan(250);
      const d2 = await m.draft.savePostDraftAction({ title: "My First Story", contentHtml: body, contentJson: { type: "doc" } });
      expect(d2.slug).toBe("my-first-story-2");
      const edited = await m.draft.savePostDraftAction({ postId: d1.id, title: "My First Story (edited)", contentHtml: body, contentJson: { type: "doc" }, tags: ["react"] });
      expect(edited.title).toBe("My First Story (edited)");
      expect((await db.postTag.count({ where: { postId: d1.id } }))).toBe(1);

      const published = await m.publish.publishPostAction({ postId: d1.id });
      expect(published.slug).toBe("my-first-story");
      const row = await db.post.findUniqueOrThrow({ where: { id: d1.id } });
      expect(row.status).toBe("PUBLISHED");
      expect(row.publishedAt).not.toBeNull();
      await expect(m.publish.publishPostAction({ postId: (await m.draft.savePostDraftAction({ title: "Tiny", contentHtml: "<p>hi</p>", contentJson: {} })).id })).rejects.toThrow();
    });

    it("other users cannot edit or publish someone else's post; signed-out users cannot do anything", async () => {
      const author = await makeUser("WRITER");
      const stranger = await makeUser();
      const post = await makePost(author.id, "DRAFT");
      signInAs(stranger);
      expect(await rejects(m.draft.savePostDraftAction({ postId: post.id, title: "Hijack", contentHtml: "<p>x</p>", contentJson: {} }))).toBe(true);
      expect(await rejects(m.publish.publishPostAction({ postId: post.id }))).toBe(true);
      nx.setSession(null);
      expect(await rejects(m.draft.savePostDraftAction({ title: "x", contentHtml: "<p>x</p>", contentJson: {} }))).toBe(true);
      expect(await rejects(m.like.toggleLikeAction(post.id))).toBe(true);
      expect(await rejects(m.createComment.createCommentAction({ postId: post.id, content: "hi" }))).toBe(true);
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).title).toBe(post.title);
    });

    it("[regression] an author cannot re-publish a post that an admin archived (moderation bypass)", async () => {
      const author = await makeUser("WRITER");
      const admin = await makeUser("ADMIN");
      const post = await makePost(author.id, "PUBLISHED");
      signInAs(admin);
      await m.adminPost.updatePostStatusAction(post.id, "ARCHIVED");
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("ARCHIVED");
      signInAs(author);
      expect(await rejects(m.publish.publishPostAction({ postId: post.id }))).toBe(true);
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("ARCHIVED");
    });

    it("[regression] cover images must be http(s) URLs", async () => {
      const author = await makeUser("WRITER");
      signInAs(author);
      const base = { title: "Cover test", contentHtml: "<p>body body body body</p>", contentJson: {} };
      expect(await rejects(m.draft.savePostDraftAction({ ...base, coverImage: "javascript:alert(1)" }))).toBe(true);
      expect(await rejects(m.draft.savePostDraftAction({ ...base, coverImage: "data:text/html;base64,PHNjcmlwdD4=" }))).toBe(true);
      expect(await rejects(m.draft.savePostDraftAction({ ...base, coverImage: "https://utfs.io/f/abc.png" }))).toBe(false);
    });
  });

  // ====================================================================
  describe("engagement", () => {
    it("likes, bookmarks and follows toggle correctly, keep counters in step, and notify the right person", async () => {
      const author = await makeUser("WRITER");
      const fan = await makeUser();
      const post = await makePost(author.id);
      signInAs(fan);
      expect(await m.like.toggleLikeAction(post.id)).toEqual({ liked: true });
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).likeCount).toBe(1);
      expect(await db.notification.count({ where: { recipientId: author.id, type: "LIKE" } })).toBe(1);
      expect(await m.like.toggleLikeAction(post.id)).toEqual({ liked: false });
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).likeCount).toBe(0);

      expect(await m.bookmark.toggleBookmarkAction(post.id)).toEqual({ bookmarked: true });
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).bookmarkCount).toBe(1);
      expect(await m.bookmark.toggleBookmarkAction(post.id)).toEqual({ bookmarked: false });

      expect(await m.follow.toggleFollowAction(author.id)).toEqual({ following: true });
      expect(await db.notification.count({ where: { recipientId: author.id, type: "FOLLOW" } })).toBe(1);
      expect(await m.follow.toggleFollowAction(author.id)).toEqual({ following: false });
      expect(await rejects(m.follow.toggleFollowAction(fan.id))).toBe(true); // can't follow yourself

      signInAs(author);
      await m.like.toggleLikeAction(post.id); // liking your own post: no self-notification
      expect(await db.notification.count({ where: { recipientId: author.id, type: "LIKE" } })).toBe(1);
    });

    it("comments: nested replies, edit/delete only your own, soft delete keeps the count right", async () => {
      const author = await makeUser("WRITER");
      const a = await makeUser();
      const b = await makeUser();
      const post = await makePost(author.id);
      signInAs(a);
      const top = await m.createComment.createCommentAction({ postId: post.id, content: "First!" });
      signInAs(b);
      const reply = await m.createComment.createCommentAction({ postId: post.id, content: "Reply", parentId: top.id });
      expect(await db.notification.count({ where: { recipientId: a.id, type: "COMMENT_REPLY" } })).toBe(1);
      expect(await db.notification.count({ where: { recipientId: author.id, type: "COMMENT" } })).toBe(1);
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).commentCount).toBe(2);

      expect(await rejects(m.updateComment.updateCommentAction({ commentId: top.id, content: "hack" }))).toBe(true);
      expect(await rejects(m.deleteComment.deleteCommentAction({ commentId: top.id }))).toBe(true);
      await m.updateComment.updateCommentAction({ commentId: reply.id, content: "Edited reply" });
      expect(await db.comment.findUniqueOrThrow({ where: { id: reply.id } })).toMatchObject({ content: "Edited reply", isEdited: true });
      await m.deleteComment.deleteCommentAction({ commentId: reply.id });
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).commentCount).toBe(1);
      const other = await makePost(author.id);
      expect(await rejects(m.createComment.createCommentAction({ postId: other.id, content: "bad parent", parentId: top.id }))).toBe(true);
    });

    it("collections, notifications and reports only work on your own / are de-duplicated", async () => {
      const author = await makeUser("WRITER");
      const a = await makeUser();
      const b = await makeUser();
      const post = await makePost(author.id);
      signInAs(a);
      const list = await m.collection.createCollectionAction({ name: "Read later", type: "READING_LIST", isPrivate: false });
      const list2 = await m.collection.createCollectionAction({ name: "Read later", type: "READING_LIST", isPrivate: true });
      expect(list2.slug).toBe("read-later-2");
      expect(await m.collection.toggleCollectionItemAction(list.id, post.id)).toEqual({ added: true });
      expect(await m.collection.toggleCollectionItemAction(list.id, post.id)).toEqual({ added: false });
      signInAs(b);
      expect(await rejects(m.collection.toggleCollectionItemAction(list.id, post.id))).toBe(true);
      expect(await rejects(m.collection.deleteCollectionAction(list.id))).toBe(true);

      const n = await db.notification.create({ data: { type: "SYSTEM", message: "hi", recipientId: a.id } });
      expect(await rejects(m.notif.markNotificationReadAction(n.id))).toBe(true); // b can't touch a's
      signInAs(a);
      await m.notif.markNotificationReadAction(n.id);
      expect((await db.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(true);

      signInAs(b);
      await m.report.createReportAction({ targetType: "POST", targetId: post.id, reason: "SPAM", reportedUserId: author.id });
      expect(await rejects(m.report.createReportAction({ targetType: "POST", targetId: post.id, reason: "SPAM" }))).toBe(true);
    });

    it("[regression] actions never send private fields (password hash, e-mail) back to the browser", async () => {
      const author = await makeUser("WRITER");
      const u = await makeUser();
      const post = await makePost(author.id);
      signInAs(u);
      const returned = await m.createComment.createCommentAction({ postId: post.id, content: "Hello there" });
      const wire = JSON.stringify(returned);
      expect(wire).not.toContain("passwordHash");
      expect(wire).not.toContain("$2b$");
      expect(wire).not.toContain(u.email);
      expect(returned).toHaveProperty("id");
    });

    it("AI assist returns suggestions for signed-in users only", async () => {
      const u = await makeUser();
      nx.setSession(null);
      expect(await rejects(m.ai.suggestTitlesAction({ contentHtml: "<p>" + "word ".repeat(30) + "</p>" }))).toBe(true);
      signInAs(u);
      const r = await m.ai.suggestTitlesAction({ contentHtml: "<p>" + "word ".repeat(30) + "</p>" });
      expect(r.titles).toHaveLength(4);
    });
  });

  // ====================================================================
  describe("admin area", () => {
    it("admin actions work for admins, write an audit log, and protect against self-harm", async () => {
      const admin = await makeUser("ADMIN");
      const user = await makeUser();
      const post = await makePost(user.id);
      signInAs(admin);
      expect(await m.adminUser.toggleUserBanAction(user.id)).toEqual({ isBanned: true });
      expect(await m.adminUser.toggleUserBanAction(user.id)).toEqual({ isBanned: false });
      expect(await rejects(m.adminUser.toggleUserBanAction(admin.id))).toBe(true);
      await m.adminUser.updateUserRoleAction(user.id, "WRITER");
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("WRITER");
      expect(await rejects(m.adminUser.updateUserRoleAction(admin.id, "READER"))).toBe(true);
      expect(await m.adminPost.toggleFeaturedAction(post.id)).toEqual({ isFeatured: true });
      const rep = await db.report.create({ data: { reason: "SPAM", targetType: "POST", targetId: post.id, reporterId: user.id } });
      await m.adminReport.updateReportStatusAction(rep.id, "RESOLVED", "done");
      expect((await db.report.findUniqueOrThrow({ where: { id: rep.id } })).resolvedAt).not.toBeNull();
      expect(await db.auditLog.count({ where: { actorId: admin.id } })).toBeGreaterThanOrEqual(5);
    });

    it("non-admins (and signed-out visitors) cannot run admin actions", async () => {
      const user = await makeUser();
      const victim = await makeUser();
      const post = await makePost(victim.id);
      signInAs(user);
      expect(await rejects(m.adminUser.toggleUserBanAction(victim.id))).toBe(true);
      expect(await rejects(m.adminUser.updateUserRoleAction(user.id, "ADMIN"))).toBe(true);
      expect(await rejects(m.adminPost.updatePostStatusAction(post.id, "ARCHIVED"))).toBe(true);
      nx.setSession(null);
      expect(await rejects(m.adminPost.toggleFeaturedAction(post.id))).toBe(true);
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("READER");
    });

    it("[regression] admin power ends the moment the role changes (a stale 'ADMIN' token must not work)", async () => {
      const admin = await makeUser("ADMIN");
      const victim = await makeUser();
      const post = await makePost(victim.id);
      signInAs(admin);
      await db.user.update({ where: { id: admin.id }, data: { role: "READER" } }); // demoted after the token was issued
      expect(await rejects(m.adminUser.toggleUserBanAction(victim.id))).toBe(true);
      expect(await rejects(m.adminPost.updatePostStatusAction(post.id, "ARCHIVED"))).toBe(true);
      expect((await db.user.findUniqueOrThrow({ where: { id: victim.id } })).isBanned).toBe(false);
    });

    it("[regression] admin actions validate their inputs", async () => {
      const admin = await makeUser("ADMIN");
      signInAs(admin);
      expect(await rejects(m.adminPost.updatePostStatusAction("not-a-valid-id", "ARCHIVED"))).toBe(true);
      expect(await rejects(m.adminUser.updateUserRoleAction((await makeUser()).id, "SUPERUSER" as never))).toBe(true);
      expect(await rejects(m.adminReport.updateReportStatusAction("nope", "BOGUS" as never))).toBe(true);
    });
  });

  // ====================================================================
  describe("[regression] banned and suspended accounts are locked out immediately", () => {
    it("a banned user's still-valid session can do nothing", async () => {
      const author = await makeUser("WRITER");
      const post = await makePost(author.id);
      const bad = await makeUser("WRITER");
      const draft = await makePost(bad.id, "DRAFT");
      const list = await db.collection.create({ data: { name: "x", slug: "x", userId: bad.id } });
      signInAs(bad); // the token was issued BEFORE the ban
      await db.user.update({ where: { id: bad.id }, data: { isBanned: true } });

      const attempts = await Promise.all([
        rejects(m.createComment.createCommentAction({ postId: post.id, content: "spam" })),
        rejects(m.like.toggleLikeAction(post.id)),
        rejects(m.bookmark.toggleBookmarkAction(post.id)),
        rejects(m.follow.toggleFollowAction(author.id)),
        rejects(m.publish.publishPostAction({ postId: draft.id })),
        rejects(m.draft.savePostDraftAction({ title: "x", contentHtml: "<p>content content content</p>", contentJson: {} })),
        rejects(m.collection.createCollectionAction({ name: "y", type: "COLLECTION", isPrivate: false })),
        rejects(m.collection.toggleCollectionItemAction(list.id, post.id)),
        rejects(m.report.createReportAction({ targetType: "POST", targetId: post.id, reason: "SPAM" })),
        rejects(m.ai.suggestTitlesAction({ contentHtml: "<p>" + "word ".repeat(30) + "</p>" })),
      ]);
      expect(attempts).toEqual(attempts.map(() => true));
      expect(await db.comment.count({ where: { authorId: bad.id } })).toBe(0);
      expect((await db.post.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("DRAFT");
    });

    it("suspended users are treated the same way", async () => {
      const author = await makeUser("WRITER");
      const post = await makePost(author.id);
      const u = await makeUser("READER", { isSuspended: true });
      signInAs(u);
      expect(await rejects(m.createComment.createCommentAction({ postId: post.id, content: "hi" }))).toBe(true);
    });

    it("deleted users (token outlives the account) are locked out too", async () => {
      const author = await makeUser("WRITER");
      const post = await makePost(author.id);
      const u = await makeUser();
      signInAs(u);
      await db.user.delete({ where: { id: u.id } });
      expect(await rejects(m.like.toggleLikeAction(post.id))).toBe(true);
    });
  });

  // ====================================================================
  describe("[regression] nothing can be done with unpublished posts that you don't own", () => {
    it("no comments, likes, bookmarks or list-adds on drafts and archived posts", async () => {
      const author = await makeUser("WRITER");
      const user = await makeUser();
      const draft = await makePost(author.id, "DRAFT");
      const archived = await makePost(author.id, "ARCHIVED");
      const list = await db.collection.create({ data: { name: "l", slug: "l", userId: user.id } });
      signInAs(user);
      for (const post of [draft, archived]) {
        expect(await rejects(m.createComment.createCommentAction({ postId: post.id, content: "peek" }))).toBe(true);
        expect(await rejects(m.like.toggleLikeAction(post.id))).toBe(true);
        expect(await rejects(m.bookmark.toggleBookmarkAction(post.id))).toBe(true);
        expect(await rejects(m.collection.toggleCollectionItemAction(list.id, post.id))).toBe(true);
      }
      expect(await db.notification.count({ where: { recipientId: author.id } })).toBe(0); // no leak of draft titles
      expect(m.emailSend.sendCommentNotificationEmail).not.toHaveBeenCalledWith(expect.objectContaining({ postTitle: draft.title }));
    });
  });

  // ====================================================================
  describe("[regression] abuse limits", () => {
    it("comments are rate limited per user", async () => {
      const author = await makeUser("WRITER");
      const post = await makePost(author.id);
      const spammer = await makeUser();
      signInAs(spammer);
      const results = [];
      for (let i = 0; i < 40; i++) results.push(await rejects(m.createComment.createCommentAction({ postId: post.id, content: `spam ${i}` })));
      expect(results.some(Boolean)).toBe(true);
      expect(await db.comment.count({ where: { authorId: spammer.id } })).toBeLessThan(40);
    });

    it("a user cannot flood one author's inbox with comment e-mails", async () => {
      const author = await makeUser("WRITER");
      const post = await makePost(author.id);
      const attacker = await makeUser();
      signInAs(attacker);
      const send = m.emailSend.sendCommentNotificationEmail as unknown as ReturnType<typeof vi.fn>;
      send.mockClear();
      for (let i = 0; i < 8; i++) await m.createComment.createCommentAction({ postId: post.id, content: `hello ${i}` }).catch(() => undefined);
      expect(send.mock.calls.filter(([a]) => (a as { to: string }).to === author.email).length).toBeLessThanOrEqual(1);
    });

    it("AI assist (a paid API) is rate limited per user", async () => {
      const u = await makeUser();
      signInAs(u);
      const html = "<p>" + "word ".repeat(30) + "</p>";
      const results = [];
      for (let i = 0; i < 30; i++) results.push(await rejects(m.ai.suggestTitlesAction({ contentHtml: html })));
      expect(results.some(Boolean)).toBe(true);
    });

    it("likes, follows and reports are rate limited too", async () => {
      const author = await makeUser("WRITER");
      const u = await makeUser();
      signInAs(u);
      const outcomes: boolean[] = [];
      for (let i = 0; i < 90; i++) {
        const p = await makePost(author.id);
        outcomes.push(await rejects(m.like.toggleLikeAction(p.id)));
      }
      expect(outcomes.some(Boolean)).toBe(true);
    });

    it("signup is limited per client address", async () => {
      nx.setSession(null);
      nx.setClientIp("10.77.0.1");
      const results = [];
      for (let i = 0; i < 8; i++) results.push((await m.signup.signupAction({ name: "Flood Bot", username: `flood-${i}`, email: `flood${i}@test.example`, password: PASSWORD })).success);
      expect(results.filter((r) => !r).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ====================================================================
  describe("[regression] double clicks and parallel requests", () => {
    it("rapid double-toggles of like/bookmark never crash and counters match the real rows", async () => {
      const author = await makeUser("WRITER");
      const u = await makeUser();
      signInAs(u);
      for (let round = 0; round < 3; round++) {
        const p = await makePost(author.id);
        const settled = await Promise.allSettled([m.like.toggleLikeAction(p.id), m.like.toggleLikeAction(p.id), m.bookmark.toggleBookmarkAction(p.id), m.bookmark.toggleBookmarkAction(p.id)]);
        expect(settled.filter((s) => s.status === "rejected")).toHaveLength(0);
        const row = await db.post.findUniqueOrThrow({ where: { id: p.id } });
        expect(row.likeCount).toBe(await db.reaction.count({ where: { postId: p.id } }));
        expect(row.bookmarkCount).toBe(await db.bookmark.count({ where: { postId: p.id } }));
      }
    });

    it("deleting the same comment twice at once decrements the count only once", async () => {
      const author = await makeUser("WRITER");
      const u = await makeUser();
      const post = await makePost(author.id);
      signInAs(u);
      const c = await m.createComment.createCommentAction({ postId: post.id, content: "to delete" });
      await Promise.allSettled([m.deleteComment.deleteCommentAction({ commentId: c.id }), m.deleteComment.deleteCommentAction({ commentId: c.id })]);
      expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).commentCount).toBe(0);
    });

    it("double-following at once does not crash and leaves one follow row", async () => {
      const author = await makeUser("WRITER");
      const u = await makeUser();
      signInAs(u);
      const settled = await Promise.allSettled([m.follow.toggleFollowAction(author.id), m.follow.toggleFollowAction(author.id)]);
      expect(settled.filter((s) => s.status === "rejected")).toHaveLength(0);
      expect(await db.follow.count({ where: { followerId: u.id, followingId: author.id } })).toBeLessThanOrEqual(1);
    });
  });

  // ====================================================================
  describe("email verification and view counting", () => {
    const verified = () => ({ emailVerified: new Date() });

    it("a token verifies the address exactly once, is stored hashed, and garbage/expired tokens fail", async () => {
      const u = await makeUser("READER");
      const token = await m.ev.createVerificationToken(u.email);
      const stored = await db.verificationToken.findMany({ where: { identifier: u.email } });
      expect(stored).toHaveLength(1);
      expect(stored[0].token).not.toBe(token); // only a hash is kept
      expect(await m.ev.verifyEmailToken("nonsense")).toBe(false);
      expect(await m.ev.verifyEmailToken("a".repeat(64))).toBe(false);
      expect(await m.ev.verifyEmailToken(token)).toBe(true);
      expect((await db.user.findUnique({ where: { id: u.id } }))?.emailVerified).not.toBeNull();
      expect(await m.ev.verifyEmailToken(token)).toBe(false); // single use

      const t2 = await m.ev.createVerificationToken(u.email);
      await db.verificationToken.updateMany({ where: { identifier: u.email }, data: { expires: new Date(Date.now() - 1000) } });
      expect(await m.ev.verifyEmailToken(t2)).toBe(false); // expired
    });

    it("a newer link replaces the older one, and parallel use of one link succeeds only once", async () => {
      const u = await makeUser("READER");
      const first = await m.ev.createVerificationToken(u.email);
      const second = await m.ev.createVerificationToken(u.email);
      expect(await m.ev.verifyEmailToken(first)).toBe(false);
      const results = await Promise.all([m.ev.verifyEmailToken(second), m.ev.verifyEmailToken(second), m.ev.verifyEmailToken(second)]);
      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it("with REQUIRE_EMAIL_VERIFICATION=true unverified accounts cannot comment or publish, but can like; verified ones can", async () => {
      const author = await makeUser("WRITER", verified());
      const post = await makePost(author.id);
      const unverified = await makeUser("READER");
      process.env.REQUIRE_EMAIL_VERIFICATION = "true";
      try {
        signInAs(unverified);
        await expect(m.createComment.createCommentAction({ postId: post.id, content: "hello there" })).rejects.toThrow(/verify/i);
        await expect(m.like.toggleLikeAction(post.id)).resolves.toBeTruthy();
        const draft = await makePost(unverified.id, "DRAFT");
        await expect(m.publish.publishPostAction({ postId: draft.id })).rejects.toThrow(/verify/i);

        await db.user.update({ where: { id: unverified.id }, data: verified() });
        await expect(m.createComment.createCommentAction({ postId: post.id, content: "hello there" })).resolves.toMatchObject({ id: expect.any(String) });
      } finally {
        delete process.env.REQUIRE_EMAIL_VERIFICATION;
      }
    });

    it("by default (flag off) unverified accounts can comment", async () => {
      const author = await makeUser("WRITER", verified());
      const post = await makePost(author.id);
      const u = await makeUser("READER");
      signInAs(u);
      await expect(m.createComment.createCommentAction({ postId: post.id, content: "works without the flag" })).resolves.toBeTruthy();
    });

    it("signup sends a verification e-mail (with a usable token) when verification is required", async () => {
      process.env.REQUIRE_EMAIL_VERIFICATION = "true";
      try {
        nx.setSession(null);
        nx.setClientIp("10.9.9.9");
        const send = vi.mocked(m.emailSend.sendVerificationEmail);
        send.mockClear();
        expect(await m.signup.signupAction({ name: "Vera Fy", username: "vera-fy", email: "vera@test.example", password: PASSWORD })).toEqual({ success: true });
        expect(send).toHaveBeenCalledTimes(1);
        const { token, to } = send.mock.calls[0][0];
        expect(to).toBe("vera@test.example");
        expect(await m.ev.verifyEmailToken(token)).toBe(true);
        expect((await db.user.findFirst({ where: { email: "vera@test.example" } }))?.emailVerified).not.toBeNull();
      } finally {
        delete process.env.REQUIRE_EMAIL_VERIFICATION;
      }
    });

    it("comment spam filter: link-drops, blocked terms and copy-paste flooding are refused; normal comments and edits pass", async () => {
      const author = await makeUser("WRITER", verified());
      const p1 = await makePost(author.id);
      const p2 = await makePost(author.id);
      const u = await makeUser("READER");
      signInAs(u);
      const post = (postId: string, content: string) => m.createComment.createCommentAction({ postId, content });
      await expect(post(p1.id, "buy https://a.example https://b.example www.c.example now")).rejects.toThrow(/links/);
      await expect(post(p1.id, "see https://a.example and https://b.example")).resolves.toBeTruthy(); // 2 links is fine
      process.env.COMMENT_BLOCKED_TERMS = "free crypto, casino";
      try {
        await expect(post(p1.id, "Get FREE Crypto today")).rejects.toThrow();
      } finally {
        delete process.env.COMMENT_BLOCKED_TERMS;
      }
      const first = await post(p1.id, "Great article, thanks for sharing!");
      await expect(post(p2.id, "great   article, thanks for sharing!")).rejects.toThrow(/already posted/);
      await expect(m.updateComment.updateCommentAction({ commentId: first.id, content: "Great article, thanks for sharing!" })).resolves.toBeUndefined();
      expect(await db.comment.count({ where: { authorId: u.id } })).toBe(2);
    });

    it("account export contains the user's own data and never a password hash", async () => {
      const author = await makeUser("WRITER", verified());
      const post = await makePost(author.id);
      const u = await makeUser("READER");
      signInAs(u);
      await m.createComment.createCommentAction({ postId: post.id, content: "my exported comment" });
      const r = await m.account.exportMyDataAction();
      expect(r.ok).toBe(true);
      const json = JSON.stringify((r as { data: unknown }).data);
      expect(json).toContain("my exported comment");
      expect(json).toContain(u.email);
      expect(json).not.toContain(passwordHash);
      expect(json).not.toMatch(/passwordHash/);
      nx.setSession(null);
      expect(await m.account.exportMyDataAction()).toMatchObject({ ok: false });
    });

    it("account deletion needs the password and the typed phrase, removes the data, and repairs other people's counters", async () => {
      const author = await makeUser("WRITER", verified());
      const post = await makePost(author.id);
      const leaver = await makeUser("READER");
      const stayer = await makeUser("READER");
      signInAs(stayer);
      await m.like.toggleLikeAction(post.id);
      await m.follow.toggleFollowAction(author.id);
      signInAs(leaver);
      await m.like.toggleLikeAction(post.id);
      await m.bookmark.toggleBookmarkAction(post.id);
      await m.createComment.createCommentAction({ postId: post.id, content: "I am leaving soon" });
      await m.follow.toggleFollowAction(author.id);
      const before = await db.post.findUnique({ where: { id: post.id } });
      expect([before!.likeCount, before!.commentCount, before!.bookmarkCount]).toEqual([2, 1, 1]);
      expect(await db.follow.count({ where: { followingId: author.id } })).toBe(2);

      expect(await m.account.deleteAccountAction({ confirmation: "delete my account", password: "wrong" })).toMatchObject({ ok: false });
      expect(await m.account.deleteAccountAction({ confirmation: "nope", password: PASSWORD })).toMatchObject({ ok: false });
      expect(await db.user.findUnique({ where: { id: leaver.id } })).not.toBeNull();

      expect(await m.account.deleteAccountAction({ confirmation: "Delete my account", password: PASSWORD })).toEqual({ ok: true });
      expect(await db.user.findUnique({ where: { id: leaver.id } })).toBeNull();
      const after = await db.post.findUnique({ where: { id: post.id } });
      expect([after!.likeCount, after!.commentCount, after!.bookmarkCount]).toEqual([1, 0, 0]);
      expect(await db.follow.count({ where: { followingId: author.id } })).toBe(1);
      // the still-valid session of the deleted user can do nothing any more
      await expect(m.like.toggleLikeAction(post.id)).rejects.toThrow();
    });

    it("the only administrator cannot delete their account", async () => {
      await db.user.updateMany({ where: { role: "ADMIN" }, data: { role: "READER" } });
      const admin = await makeUser("ADMIN");
      signInAs(admin);
      expect(await m.account.deleteAccountAction({ confirmation: "delete my account", password: PASSWORD })).toMatchObject({ ok: false, error: expect.stringMatching(/only administrator/) });
      expect(await db.user.findUnique({ where: { id: admin.id } })).not.toBeNull();
    });

    it("password reset: same answer for unknown addresses, one-hour single-use link, old password and old sessions stop working", async () => {
      const send = vi.mocked(m.emailSend.sendPasswordResetEmail);
      send.mockClear();
      nx.setSession(null);
      nx.setClientIp("10.55.0.1");

      expect(await m.reset.requestPasswordResetAction("nobody-here@test.example")).toEqual({ ok: true });
      expect(send).not.toHaveBeenCalled(); // no mail, but the visitor can't tell
      expect(await m.reset.requestPasswordResetAction("not an email")).toMatchObject({ ok: false });

      const u = await makeUser("READER");
      // a session created with the OLD password
      const oldPwv = m.pwVersion.passwordVersion(passwordHash);
      nx.setSession({ id: u.id, name: u.name, email: u.email, role: u.role, username: null, pwv: oldPwv });
      expect(await m.reqSession.getActiveSession()).not.toBeNull();
      nx.setSession(null);

      expect(await m.reset.requestPasswordResetAction(u.email.toUpperCase())).toEqual({ ok: true });
      expect(send).toHaveBeenCalledTimes(1);
      const { token, to } = send.mock.calls[0][0];
      expect(to).toBe(u.email);
      const stored = await db.verificationToken.findMany({ where: { identifier: `reset:${u.email}` } });
      expect(stored).toHaveLength(1);
      expect(stored[0].token).not.toBe(token); // hashed at rest
      expect(stored[0].expires.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);

      // kinds can't be swapped
      expect(await m.ev.verifyEmailToken(token)).toBe(false);
      expect(await m.reset.resetPasswordAction(token, "weak")).toMatchObject({ ok: false }); // rejected before the link is used up
      expect(await m.reset.resetPasswordAction("f".repeat(64), "Brand-New-Passw0rd")).toMatchObject({ ok: false });

      expect(await m.reset.resetPasswordAction(token, "Brand-New-Passw0rd")).toEqual({ ok: true });
      expect(await m.reset.resetPasswordAction(token, "Another-Passw0rd9")).toMatchObject({ ok: false }); // single use

      const authorize = credentialsAuthorize();
      expect(await authorize({ email: u.email, password: PASSWORD })).toBeNull(); // old password is dead
      expect(await authorize({ email: u.email, password: "Brand-New-Passw0rd" })).toMatchObject({ id: u.id });
      expect((await db.user.findUnique({ where: { id: u.id } }))?.emailVerified).not.toBeNull();

      // the session that existed before the reset no longer works; one without a fingerprint (older session) still does
      nx.setSession({ id: u.id, name: u.name, email: u.email, role: u.role, username: null, pwv: oldPwv });
      expect(await m.reqSession.getActiveSession()).toBeNull();
      const newHash = (await db.user.findUnique({ where: { id: u.id } }))!.passwordHash;
      nx.setSession({ id: u.id, name: u.name, email: u.email, role: u.role, username: null, pwv: m.pwVersion.passwordVersion(newHash) });
      expect(await m.reqSession.getActiveSession()).not.toBeNull();
    });

    it("password reset: the mail is rate limited per address and banned accounts get no link", async () => {
      const send = vi.mocked(m.emailSend.sendPasswordResetEmail);
      const u = await makeUser("READER");
      nx.setSession(null);
      nx.setClientIp("10.55.1.1");
      send.mockClear();
      for (let i = 0; i < 6; i++) expect(await m.reset.requestPasswordResetAction(u.email)).toEqual({ ok: true });
      expect(send).toHaveBeenCalledTimes(3);

      const banned = await makeUser("READER", { isBanned: true });
      send.mockClear();
      await m.reset.requestPasswordResetAction(banned.email);
      expect(send).not.toHaveBeenCalled();
    });

    it("views: counted once per visitor, not for the author, never for drafts", async () => {
      const author = await makeUser("WRITER", verified());
      const post = await makePost(author.id);
      const draft = await makePost(author.id, "DRAFT");
      const count = async (id: string) => (await db.post.findUnique({ where: { id } }))!.viewCount;

      nx.setSession(null);
      nx.setClientIp("10.20.0.1");
      await m.view.recordViewAction(post.id);
      await m.view.recordViewAction(post.id); // same visitor, same hour
      expect(await count(post.id)).toBe(1);
      nx.setClientIp("10.20.0.2");
      await m.view.recordViewAction(post.id);
      expect(await count(post.id)).toBe(2);

      await m.view.recordViewAction(draft.id);
      expect(await count(draft.id)).toBe(0);

      signInAs(author);
      await m.view.recordViewAction(post.id);
      expect(await count(post.id)).toBe(2); // author's own view ignored
      await expect(m.view.recordViewAction("")).resolves.toBeUndefined();
    });
  });

  // ====================================================================
  describe("rendering and feeds", () => {
    it("post HTML is sanitised: scripts, event handlers and javascript: links are removed; headings get ids", async () => {
      const html = await m.render.renderPostHtml(
        `<h2>Intro</h2><p onclick="alert(1)">Hi <a href="javascript:alert(2)">x</a> <a href="https://example.com" target="_blank" rel="noopener">ok</a></p>` +
          `<script>alert(3)</script><img src="x" onerror="alert(4)"><iframe src="https://evil.example"></iframe><pre><code class="language-js">const a = 1;</code></pre>`
      );
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/onclick|onerror/i);
      expect(html).not.toMatch(/javascript:/i);
      expect(html).not.toMatch(/<iframe/i);
      expect(html).toContain('href="https://example.com"');
      expect(html).toMatch(/<h2 id="[^"]+">Intro<\/h2>/);
      expect(html).toContain("hljs");
    });

    it("the RSS feed lists only published posts and escapes XML", async () => {
      const author = await makeUser("WRITER", { name: "A & B <Writers>" });
      await makePost(author.id, "PUBLISHED", { title: `Fish & "Chips" <b>`, slug: "fish-and-chips" });
      await makePost(author.id, "DRAFT", { title: "Secret draft", slug: "secret-draft" });
      const res = await m.rss.GET();
      const xml = await res.text();
      expect(res.headers.get("content-type")).toContain("xml");
      expect(xml).toContain("Fish &amp; &quot;Chips&quot; &lt;b&gt;");
      expect(xml).not.toContain("Secret draft");
      expect(xml).not.toMatch(/<b>/);
    });

    it("[regression] JSON-LD for the article page cannot break out of its <script> tag", async () => {
      const { serializeJsonLd } = await import("@/lib/json-ld");
      const evil = { headline: `</script><script>alert(1)</script>`, author: { name: `<!-- x --> \u2028 & ok` } };
      const out = serializeJsonLd(evil);
      expect(out).not.toMatch(/<\/script/i);
      expect(out).not.toContain("<");
      expect(out).not.toMatch(/[\u2028\u2029]/);
      expect(JSON.parse(out)).toEqual(evil); // still the same data once parsed
      // what the page did before the fix:
      expect(JSON.stringify(evil)).toContain("</script>");
    });
  });
});
