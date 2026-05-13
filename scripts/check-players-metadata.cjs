#!/usr/bin/env node
/**
 * Comprueba si existe `players.metadata` en la base apuntada por DATABASE_URL.
 * Si falta pero `npm run db:migrate` dice que no hay nada pendiente, Next y migrate
 * están usando distintas URLs (revisá .env.development.local vs .env).
 */
const path = require("node:path");
const { Client } = require("pg");

const root = path.resolve(__dirname, "..");
const { loadDatabaseEnv } = require("./load-database-env.cjs");
loadDatabaseEnv(root);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("[check-players-metadata] DATABASE_URL no está definida.");
  process.exit(1);
}

function hostHint(connectionString) {
  try {
    const u = new URL(connectionString.replace(/^postgresql:/, "postgres:"));
    return `${u.hostname}:${u.port || "5432"}`;
  } catch {
    return "(no se pudo parsear el host)";
  }
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select 1 as ok
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'players'
         and column_name = 'metadata'
       limit 1`,
    );
    const ok = rows.length > 0;
    console.info(`[check-players-metadata] Host: ${hostHint(url)}`);
    if (ok) {
      console.info("[check-players-metadata] OK: existe public.players.metadata");
      process.exit(0);
    }
    console.error(
      "[check-players-metadata] FALTA la columna public.players.metadata.\n" +
        "  → Ejecutá: npm run db:migrate\n" +
        "  → Asegurate de que sea la misma DATABASE_URL que usa `next dev` (misma cadena de .env que `scripts/load-database-env.cjs`).",
    );
    process.exit(2);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[check-players-metadata]", e);
  process.exit(1);
});
