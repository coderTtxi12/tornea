#!/usr/bin/env node
/**
 * Runs Drizzle migrations against DATABASE_URL (Supabase Postgres or local).
 * Carga `.env` y después `.env.local` (este último pisa claves repetidas).
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

function describeDatabaseTarget(urlRaw) {
  try {
    const normalized = urlRaw.replace(/^postgres(ql)?:/i, "postgresql:");
    const u = new URL(normalized);
    const db = (u.pathname || "").replace(/^\//, "") || "(default)";
    const host = u.hostname || "?";
    const port = u.port || "5432";
    return `${host}:${port}/${db}`;
  } catch {
    return "(no se pudo interpretar DATABASE_URL)";
  }
}

console.info(
  `[db:migrate] Objetivo: ${describeDatabaseTarget(process.env.DATABASE_URL.trim())} ` +
    "(debe coincidir con la misma URL que usa `next dev` / producción).",
);
console.info("[db:migrate] Applying Drizzle migrations…");

execSync("npx drizzle-kit migrate", {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env },
});

console.info("");
console.info(
  "[db:migrate] Comando terminó bien. (A veces el spinner de Drizzle oculta la línea «migrations applied» en la terminal.)\n" +
    "  Si en Next seguís viendo «column … does not exist», la base puede ser otra: `npm run db:check:players-metadata`.",
);
