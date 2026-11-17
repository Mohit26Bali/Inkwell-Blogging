# PROJECT_CONTEXT — Inkwell (Blogging)

Hand this file plus README.md to a new AI assistant. Status as of 2026-11: audited, hardened, tested, live-verified. See "How to run.md" for setup.

## What it is
Multi-user blogging platform: Next.js 15 (App Router, Server Actions), NextAuth v5 (JWT, credentials + optional Google/GitHub), Prisma 6 + PostgreSQL, Zod 4, Tiptap editor, sanitized HTML rendering (rehype-sanitize), UploadThing images, Groq AI writing assist, Resend email. Features: posts/drafts/publish, comments + replies, likes, bookmarks, follows, collections, reports, notifications, admin area (posts/users/reports), RSS, SEO metadata/JSON-LD.

## Layout
- `src/features/<area>/{actions,services,schemas,components}` — domain code; Server Actions are `*.action.ts`.
- `src/server/auth/` — `config.ts`, `edge-config.ts` (middleware split), `require-session.ts` (**always use `requireSession`/`getActiveSession`** in actions: it re-reads the user from the DB so bans/demotions apply immediately despite JWTs).
- `src/server/security/action-limits.ts` — per-action rate limits (`enforceActionLimit`, `allowAction`), in-memory.
- `src/lib/{json-ld,client-ip,rate-limit,render-content}.ts`; `src/server/email/` (Resend, lazy; no-op without key or under test).
- `src/test/` — vitest integration suite (real Server Actions, throwaway schema `blog_test_*`).
- `prisma/` schema, seed.

## Conventions to keep
- Server Actions must return minimal values (ids/flags), never DB rows (a past version leaked the author's password hash).
- Only PUBLISHED posts accept interactions and appear publicly/in metadata.
- Emails are compared/stored lower-case.

## Audit findings that were FIXED (each proven by a failing test first)
Banned/suspended users and demoted admins kept acting on a live JWT; OAuth login bypassed ban check and left new users without profile; admin-archived post could be re-published by author; interactions on drafts/archived posts (leaked private titles via notifications/emails); no rate limits (comments, likes, follows, reports, paid AI, email flooding, signup/login); double-click races (crash, comment count −1); case-sensitive emails (duplicate accounts); `javascript:`/`data:` cover URLs; JSON-LD `</script>` XSS via title/author; draft title in page `<head>`; Resend client built at import (crash without key); Server Action returned password hash; admin inputs unvalidated; unsafe seed. Added security headers, removed `X-Powered-By`. Dependencies upgraded: audit went from 5 critical/24 high to 0 critical/5 high.

## Added later (same audit)
- **Email verification** (`src/server/auth/email-verification.ts`, page `/verify-email`): single-use 24h links, only a SHA-256 hash is stored, newest link wins. Enforced for comments, publishing and draft saves only when `REQUIRE_EMAIL_VERIFICATION=true` (default OFF, because Resend's sandbox sender only reaches the account owner; enable once a sending domain is verified). Likes/bookmarks stay open. Use `requireVerifiedSession` for new content-creating actions.
- **View counting** (`record-view.action.ts` + `ViewTracker`): one view per visitor per post per hour, author and non-published posts excluded. Trending/dashboard numbers now mean something (real traffic only; bots that don't run JS aren't counted).

- **Content-Security-Policy** (`src/lib/csp.ts`, `src/middleware.ts`): per-request nonce, `strict-dynamic`, no inline-script allowance, framing/plugins blocked. The root layout reads `x-nonce` (this makes every page dynamic - required for nonces) and passes it to next-themes. If you add a third-party script or a new upload/API host, extend `buildCsp`. Verified by checking every executable `<script>` carries the nonce; NOT yet exercised in a real browser.
- **Admin audit log**: bans, role changes, post status/featured, report outcomes are written to `audit_logs` in the SAME transaction as the change, and listed read-only at `/admin/audit`.
- **Comment spam filter** (`features/comments/spam-filter.ts`): max 2 links, optional `COMMENT_BLOCKED_TERMS` (comma list), same-text-within-10-min refused. No approval queue (needs a schema change; see remaining items).
- **Account settings** (`/settings`): download my data (JSON, no password hash) and delete account (password + typed phrase; last admin blocked; post counters of other people's posts are recomputed after the cascade).
- **Password reset** (`/forgot-password`, `/reset-password`): same answer for unknown addresses, per-address/IP limits, 1-hour single-use hashed link stored as `reset:<email>` in `verification_tokens`. Sessions carry a fingerprint of the password hash (`pwv`, `server/auth/password-version.ts`); after a reset every earlier session is rejected by `getActiveSession`. Sessions created before this feature have no fingerprint and stay valid until they expire.

## Verification
- `npx tsc --noEmit`, eslint: clean. `npx vitest run`: 60/60 pass.
- Live script against the production build (real NextAuth flow, Server Action replay, throwaway schema): 58/58 checks.
- Real data untouched (users 4, posts 12); no leftover test schemas.

## Known remaining items (not fixed)
1. `SiteSettings` (allowSignups, requireEmailVerify, maintenanceMode) are never read (dead config). Verification is controlled by the env flag below instead.
2. MODERATOR/WRITER roles defined but unused.
3. No comment approval queue / CAPTCHA (a queue needs a new Comment column + migration; CAPTCHA needs Turnstile/hCaptcha keys and browser testing). No 2FA. Uploaded images (UploadThing) are not removed when an account is deleted.
4. In production, Server Actions mask thrown error messages (users see a generic error); actions would need to return result objects for friendly messages.
5. Rate limiter is in-memory → per-instance only; use Redis/Upstash if scaled horizontally. Needs correct `TRUSTED_PROXY_HOPS`.
6. 5 remaining high npm audit items need major upgrades (uploadthing/shadcn tooling).
7. Password policy is length + small blocklist only.
8. Build warning (jose/@auth/core edge) is benign.

## Secrets / operational notes
- `.env` holds real Groq, UploadThing and Resend keys (values not recorded here). The Resend key was exposed earlier in the session history → **rotate it**.
- Seed accounts use a publicly known password unless `SEED_PASSWORD` is set.
- Folder is NOT a git repository yet. `.gitignore` already excludes `.env*` (except `.env.example`), `.next`, `node_modules`; check `git status` before first commit.
- `Summary.html` is a pre-existing project summary.
