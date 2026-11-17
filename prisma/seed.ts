import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readingTime from "reading-time";
import slugify from "slugify";

const db = new PrismaClient();

const CATEGORIES = [
  { name: "Technology", description: "Software, hardware, and everything in between." },
  { name: "Design", description: "UI, UX, and the craft of making things beautiful." },
  { name: "Startups", description: "Building companies from zero to one." },
  { name: "Productivity", description: "Getting more done with less friction." },
  { name: "Writing", description: "The craft and business of writing well." },
];

const TAGS = [
  "javascript",
  "react",
  "nextjs",
  "typescript",
  "css",
  "career",
  "ai",
  "databases",
  "opensource",
  "leadership",
];

// Matches the HTML Tiptap's editor.getHTML() produces, since real posts are authored that way.
const SAMPLE_CONTENT = `<h2>Introduction</h2>
<p>Great writing starts with a clear idea and the discipline to cut everything that doesn't serve it. This piece explores that idea in depth, walking through practical examples along the way.</p>
<h3>Why it matters</h3>
<p>Readers can tell within a paragraph whether a piece was written with care. Structure, rhythm, and honesty do more work than any single clever sentence.</p>
<pre><code class="language-ts">function focus&lt;T&gt;(value: T): T {
  return value;
}</code></pre>
<blockquote><p>The best editing tool is a second pass with fresh eyes.</p></blockquote>
<h3>A short list</h3>
<ul>
<li><p>Start with the reader's problem</p></li>
<li><p>Cut the throat-clearing</p></li>
<li><p>End on a concrete takeaway</p></li>
</ul>
<p>Writing regularly, and publishing even when a piece feels unfinished, is the fastest way to improve.</p>`;

async function main() {
  console.log("Seeding database...");

  const categories = await Promise.all(
    CATEGORIES.map((c) =>
      db.category.upsert({
        where: { name: c.name },
        update: {},
        create: { ...c, slug: slugify(c.name, { lower: true }) },
      })
    )
  );

  const tags = await Promise.all(
    TAGS.map((name) =>
      db.tag.upsert({
        where: { name },
        update: {},
        create: { name, slug: slugify(name, { lower: true }) },
      })
    )
  );

  // SAMPLE DATA ONLY. These accounts (including an ADMIN) share a password that is published in the README,
  // so the seed refuses to run against a production database unless explicitly forced, and the password
  // can be replaced with SEED_PASSWORD.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_IN_PRODUCTION !== "1") {
    throw new Error(
      "Refusing to seed: NODE_ENV=production. The seeded accounts use a well-known password. " +
        "Set ALLOW_SEED_IN_PRODUCTION=1 only if you really intend this (and set SEED_PASSWORD)."
    );
  }
  const seedPassword = process.env.SEED_PASSWORD ?? "Password123";
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const authorsData = [
    { name: "Ada Iwu", username: "ada-iwu", email: "ada@inkwell.dev", role: "WRITER" as const, bio: "Frontend engineer writing about React, performance, and design systems." },
    { name: "Marcus Chen", username: "marcus-chen", email: "marcus@inkwell.dev", role: "WRITER" as const, bio: "Building startups and writing about product, growth, and leadership." },
    { name: "Priya Sharma", username: "priya-sharma", email: "priya@inkwell.dev", role: "WRITER" as const, bio: "Designer exploring the intersection of typography and code." },
    { name: "Admin", username: "admin", email: "admin@inkwell.dev", role: "ADMIN" as const, bio: "Platform administrator." },
  ];

  const authors = [];
  for (const a of authorsData) {
    const user = await db.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        name: a.name,
        email: a.email,
        passwordHash,
        role: a.role,
        emailVerified: new Date(),
        profile: { create: { username: a.username, bio: a.bio } },
        settings: { create: {} },
      },
    });
    authors.push(user);
  }

  const postTitles = [
    "The Case for Boring Technology",
    "Designing Interfaces That Disappear",
    "What I Learned Shipping Ten Products",
    "A Practical Guide to Server Components",
    "Why Your First Draft Should Be Bad",
    "The Hidden Cost of Premature Abstraction",
    "Typography Is a Programming Problem",
    "Building a Reading Habit as an Engineer",
    "Notes on Leading a Small Team",
    "The Editor's Guide to Cutting Words",
    "How We Scaled to a Million Requests",
    "Design Systems Are Products, Not Projects",
  ];

  for (let i = 0; i < postTitles.length; i++) {
    const title = postTitles[i];
    const slug = slugify(title, { lower: true, strict: true });
    const author = authors[i % (authors.length - 1)];
    const stats = readingTime(SAMPLE_CONTENT.replace(/<[^>]*>/g, " "));

    const existing = await db.post.findUnique({ where: { slug } });
    if (existing) continue;

    await db.post.create({
      data: {
        title,
        slug,
        subtitle: "A closer look at craft, clarity, and the work behind the work.",
        content: SAMPLE_CONTENT,
        excerpt: "Great writing starts with a clear idea and the discipline to cut everything that doesn't serve it.",
        coverImage: `https://picsum.photos/seed/${slug}/1200/630`,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24),
        readingTimeMinutes: Math.max(1, Math.round(stats.minutes)),
        wordCount: stats.words,
        isFeatured: i < 3,
        viewCount: Math.floor(Math.random() * 5000),
        likeCount: Math.floor(Math.random() * 300),
        commentCount: 0,
        authorId: author.id,
        categories: {
          create: [{ categoryId: categories[i % categories.length].id }],
        },
        tags: {
          create: [
            { tagId: tags[i % tags.length].id },
            { tagId: tags[(i + 3) % tags.length].id },
          ],
        },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
