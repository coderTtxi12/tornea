#!/usr/bin/env node
/**
 * Runs Drizzle migrations against DATABASE_URL (Supabase Postgres or local).
 * Carga la misma cadena de archivos que Next.js: .env, .env.local, .env.development|production, .env.*.local
 * (ver `scripts/load-database-env.cjs`).
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const { loadDatabaseEnv } = require("./load-database-env.cjs");
loadDatabaseEnv(root);

function logLoadedEnvSources() {
  const isProd = process.env.NODE_ENV === "production";
  const chain = isProd
    ? [".env", ".env.local", ".env.production", ".env.production.local"]
    : [".env", ".env.local", ".env.development", ".env.development.local"];
  const loaded = chain.filter((n) => fs.existsSync(path.join(root, n)));
  if (loaded.length > 0) {
    console.info(`[db:migrate] Archivos .env leídos (en orden, el último gana): ${loaded.join(" → ")}`);
  }
}

logLoadedEnvSources();

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "[db:migrate] DATABASE_URL is not set.\n" +
      "  Supabase → Project Settings → Database → Connection string → URI.\n" +
      "  Prefer the direct connection (port 5432) for migrations, not the pooler (6543),\n" +
      "  unless Supabase docs say otherwise for your plan.\n" +
      "  Add DATABASE_URL to .env, .env.local, or .env.development.local (misma que use `next dev`).",
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
    "  Si falta la tabla league_referees: `npm run db:ensure:league-referees` (misma DATABASE_URL que Next).",
);
