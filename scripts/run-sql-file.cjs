#!/usr/bin/env node
/**
 * Ejecuta un archivo .sql contra DATABASE_URL (misma carga de .env que db:migrate).
 * Uso: npm run db:apply:sql -- scripts/sql/ensure-players-metadata.sql
 */
const path = require("node:path");
const fs = require("node:fs");
const { Client } = require("pg");

const root = path.resolve(__dirname, "..");
const { loadDatabaseEnv } = require("./load-database-env.cjs");
loadDatabaseEnv(root);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("[db:apply:sql] DATABASE_URL is not set.");
  process.exit(1);
}

const rel = process.argv[2];
if (!rel) {
  console.error("[db:apply:sql] Pasá la ruta al .sql, ej: scripts/sql/ensure-players-metadata.sql");
  process.exit(1);
}

const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
if (!fs.existsSync(abs)) {
  console.error("[db:apply:sql] No existe el archivo:", abs);
  process.exit(1);
}

const sql = fs.readFileSync(abs, "utf8");

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.info("[db:apply:sql] OK:", abs);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[db:apply:sql]", e);
  process.exit(1);
});
