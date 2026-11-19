# Inkwell

A full-stack publishing platform in the spirit of Medium/Ghost/Substack — write, publish, and
discover long-form articles, with real accounts, comments, notifications, and an admin panel
behind it. Built with Next.js 15 (App Router), TypeScript, Prisma/PostgreSQL, and NextAuth.

## Features

### Writing & publishing

- Tiptap-based rich text editor (headings, lists, code blocks, tables, images, links) with a
  formatting toolbar, live word count/reading time, and autosave to a draft
- Resume editing any draft later (`/new-post/[id]`), ownership-checked
- Cover image, subtitle, and excerpt fields; real image upload via UploadThing (4MB limit) with a
  paste-a-URL fallback
- Editor content is sanitized and syntax-highlighted server-side
  (`rehype-parse → rehype-slug → rehype-sanitize → rehype-highlight → rehype-stringify`) before
  ever reaching the browser — safe against XSS, headings get slugged ids for the table of
  contents, code blocks get copy buttons
- AI writing assist (Groq `openai/gpt-oss-120b`) — generates title suggestions, an excerpt, and
  tag suggestions from the current draft
- Tagging — free-form tag input with autocomplete-free entry, deduplicated and usage-counted

### Reading & discovery

- Article page with serif reading typography, sticky table of contents, reading progress bar,
  author card, related articles, and JSON-LD for SEO
- Discover page — search, sort (newest/trending/most-liked), category filter, pagination, all
  URL-driven
- Category index and per-category listings
- A "Following" feed of posts from writers you follow
- `/sitemap.xml`, `/robots.txt`, and `/rss.xml`, all generated from real data

### Social & engagement

- Comments with one level of nested replies, edit and soft-delete (tombstoned so replies to a
  deleted comment stay reachable)
- Likes and bookmarks with optimistic UI and rollback on failure
- Follow/unfollow, with a batched (non-N+1) "are you following these people" check
- Reading lists / collections — create, save articles to them, remove, delete
- Notifications inbox (bell icon, unread badge, mark read) for follows, comments, replies, and
  likes, each with a matching transactional email (Resend) that respects the recipient's
  per-type email preference
- A reusable report dialog (post/comment) feeding an admin moderation queue

### Accounts & security

- Email/password (Credentials) plus Google/GitHub OAuth via NextAuth v5, JWT sessions
- Role-based access (`READER` / `WRITER` / `MODERATOR` / `ADMIN`) enforced in Edge middleware
- Password strength requirements (length, character classes, common-password blocklist) with a
  live strength meter on signup
- In-memory rate limiting on login (5/15 min per email) and signup (5/hour per IP)

### Admin & dashboard

- Admin panel — live stats + posts-per-day chart, users table (search, role change, ban/unban),
  posts table (search, status filter, feature toggle), moderation queue — all backed by server
  actions that write an audit log entry
- User dashboard — published/draft counts, aggregate views/likes/comments, bookmark count, your
  stories table, recent-activity feed

## Tech stack

Next.js 15 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Prisma 6 · PostgreSQL ·
NextAuth v5 · TanStack Query · React Hook Form · Zod · Tiptap · Framer Motion · Groq (AI) ·
Resend (email) · UploadThing (media)

## Project structure

```text
src/
  app/                    Route segments (App Router)
    (auth)/                 Login/signup — no site chrome
    (main)/                 Public site — header + footer (home, discover, articles, feed, profiles)
    api/auth/                NextAuth route handler
    api/uploadthing/          UploadThing route handler
    new-post/                Protected editor routes (new + resume-draft)
    dashboard/                Protected user dashboard
    admin/                     Protected admin panel (ADMIN role only)
  features/               Feature-based modules — each with its own actions/, components/,
                           schemas/, services/ as needed
    auth/  posts/  editor/  comments/  profile/  search/  bookmarks/
    dashboard/  admin/  notifications/  collections/  reports/
  components/
    ui/                     shadcn/ui primitives
    layout/                  Header, footer, admin sidebar, theme toggle
    motion/                   Reveal, Stagger/StaggerItem (Framer Motion primitives)
  server/
    auth/                    NextAuth config — full (Node) + Edge-safe split
    db/                       Prisma client singleton
    email/                     Resend client, templates, send functions
    ai/                         Groq client
    uploadthing/                 File router (auth-gated, image-only, 4MB limit)
  lib/                    Slug generation, password strength, HTML render pipeline, rate
                          limiting, cn()
  middleware.ts           Route protection (Edge runtime)
prisma/
  schema.prisma            Full data model (26 models)
  migrations/                Migration history
  seed.ts                    Sample categories, tags, authors, and published posts
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

Create a database and a role for it:

```sql
CREATE ROLE inkwell LOGIN PASSWORD 'your-password-here';
CREATE DATABASE blogging OWNER inkwell;
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Generate with `npx auth secret` |
| `AUTH_URL` | Yes | `http://localhost:3000` in dev |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No | Optional OAuth provider — Credentials login works without it |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | No | Optional OAuth provider |
| `RESEND_API_KEY` | No | Needed for transactional email; without it, sends are logged and swallowed, not fatal |
| `EMAIL_FROM` | No | Sandbox sender works with no domain verification, but only delivers to the account owner |
| `UPLOADTHING_TOKEN` | No | Needed for real image upload |
| `GROQ_API_KEY` | No | Needed for AI title/excerpt/tag suggestions |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL used in generated links (sitemap, RSS, emails) |

### 4. Apply the schema and seed data

```bash
npx prisma migrate deploy
npx prisma db seed
```

Use `npx prisma migrate dev` instead of `migrate deploy` if you're actively changing
`schema.prisma` and want a new migration generated against your dev database.

### 5. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`. Seeded login: any seeded author's email (see `prisma/seed.ts`,
e.g. `ada@inkwell.dev`) with password `Password123`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server (after `build`) |
| `npm run lint` | Run ESLint |

## Known limitations / roadmap

- Comments have no `@mentions` or markdown rendering
- No UI for grouping posts into a `Series` (the schema supports it)
- No functioning Preview mode in the editor (use `/new-post/[id]` to review an unpublished draft)
- No admin screens for categories/tags/newsletter/site settings/media library
- Analytics is a single overview chart — no per-post view trends or traffic sources
- Search is a plain substring match, no ranking or autocomplete
- No automated test suite yet
- Rate limiting is in-memory (per-instance, resets on restart) — fine for a single deployment, not
  for a multi-instance one
- The bundled Resend sender is unverified, so outbound email only reaches the account owner until
  a domain is verified in the Resend dashboard

## License

Personal/portfolio project — not currently licensed for reuse.

## Setup notes

- Install with `npm install --legacy-peer-deps`.
- Apply the database schema with `npx prisma migrate deploy` before the first run.
- Optional settings (e-mail, proxies, seed password) are documented in `.env.example`.
