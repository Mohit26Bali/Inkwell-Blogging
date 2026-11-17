// Creates a throwaway PostgreSQL SCHEMA for integration tests and drops it afterwards.
//
// Why a schema and not a database: the project's database role (see README: `inkwell` owning
// `blogging`) normally cannot CREATE DATABASE, but it can create schemas in its own database. A fresh
// schema `blog_test_<random>` is completely isolated from the real data in `public`; the migrations are
// applied to it, DATABASE_URL is pointed at it (`?schema=...`), and it is dropped (CASCADE) at the end.
// The harness refuses to run against anything that is not a `blog_test_*` schema.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

export interface TestDatabase {
  schema: string;
  url: string;
  drop: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase | null> {
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) return null;

  const schema = `blog_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const admin = new PrismaClient({ datasourceUrl: base, log: [] });

  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } catch {
    await admin.$disconnect().catch(() => undefined);
    return null; // server unreachable / no permission -> integration tests are skipped
  }

  const testUrl = new URL(base);
  testUrl.searchParams.set("schema", schema);
  const url = testUrl.toString();

  try {
    execFileSync(
      process.execPath,
      [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
      { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe", cwd: process.cwd() }
    );
  } catch (error) {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.$disconnect().catch(() => undefined);
    throw error;
  }

  // Hard safety: from here on every Prisma client in this process must use the throwaway schema.
  process.env.DATABASE_URL = url;
  if (!new URL(process.env.DATABASE_URL).searchParams.get("schema")?.startsWith("blog_test_")) {
    throw new Error("Refusing to run integration tests: DATABASE_URL is not a throwaway schema.");
  }

  return {
    schema,
    url,
    async drop() {
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.$disconnect();
    },
  };
}
