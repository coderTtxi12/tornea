#!/usr/bin/env node
/**
 * Runs Drizzle migrations against DATABASE_URL (Supabase Postgres or local).
 * Loads .env.local then .env (local overrides file wins for duplicate keys only if we load .env first then local - we want local to win).
 */
const path = require("node:path");
const { config } = require("dotenv");
const { execSync } = require("node:child_process");
const fs = require("node:fs");

const root = path.resolve(__dirname, "..");

for (const file of [".env", ".env.local"]) {
  const p = path.join(root, file);
  if (fs.existsSync(p)) {
    config({ path: p, override: file === ".env.local" });
  }
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "[db:migrate] DATABASE_URL is not set.\n" +
      "  Supabase → Project Settings → Database → Connection string → URI.\n" +
      "  Prefer the direct connection (port 5432) for migrations, not the pooler (6543),\n" +
      "  unless Supabase docs say otherwise for your plan.\n" +
      "  Add DATABASE_URL to .env or .env.local",
  );
  process.exit(1);
}

console.info("[db:migrate] Applying Drizzle migrations…");

execSync("npx drizzle-kit migrate", {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env },
});
