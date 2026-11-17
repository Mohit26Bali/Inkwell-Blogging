# How to run Inkwell (Blogging)

Verified on Windows 11, Node 20+, PostgreSQL. Everything below was exercised on 2026-11 (43 automated tests + 35 live checks against the production build).

## 1. Prerequisites
- Node.js 20+ and npm
- A PostgreSQL database (local or hosted, e.g. Neon/Supabase). The DB role needs permission to create tables.

## 2. Install
```
npm install --legacy-peer-deps
```
`--legacy-peer-deps` is required: plain `npm install` crashes in npm's resolver (`edgesOut` error) with this dependency tree.

## 3. Configure `.env`
Copy `.env.example` to `.env` and fill in values (never commit `.env`; it is git-ignored).
- Required: `DATABASE_URL`, `AUTH_SECRET` (generate with `npx auth secret` or any 32+ random bytes), `AUTH_URL` / site URL as listed in `.env.example`.
- Optional (features degrade gracefully when missing): `RESEND_API_KEY` (emails are skipped, signup still works), `GROQ_API_KEY` (AI assist), `UPLOADTHING_TOKEN` (image uploads), Google/GitHub OAuth ids.
- `REQUIRE_EMAIL_VERIFICATION=true` makes unverified accounts unable to comment/publish. Leave unset until Resend can reach real users (verified domain + `EMAIL_FROM`).
- `COMMENT_BLOCKED_TERMS` (optional): comma-separated words/phrases that make a comment be refused.
- `TRUSTED_PROXY_HOPS`: number of reverse proxies in front of the app (default 0). Set it correctly in production or per-IP rate limits can be spoofed/ineffective.
- Resend free sandbox sender can only email your own account address; verify a domain to email others.

## 4. Database
```
npx prisma migrate deploy      # or: npx prisma db push  (dev only)
npx prisma generate
npm run seed                   # optional demo data
```
Seed creates demo accounts with a known password (`Password123`) unless `SEED_PASSWORD` is set. Seeding is refused when `NODE_ENV=production` unless `ALLOW_SEED_IN_PRODUCTION=1`. Never seed a real public site with the default password.

## 5. Run
- Development: `npm run dev` → http://localhost:3000
- Production: `npm run build` then `npm start`

## 6. Verify
```
npx tsc --noEmit
npx eslint .
npx vitest run
```
Tests run against a throwaway Postgres *schema* (`blog_test_*`) created in the database from `.env` and dropped afterwards — they never touch real tables. No email is sent during tests.

## Troubleshooting
- `npm install` crash `Cannot read properties of null (reading 'edgesOut')` → use `--legacy-peer-deps`.
- Build warning about `jose`/`@auth/core` edge runtime is benign.
- Signed in but admin pages bounce you: role is read live from the database; check the user's `role`.
