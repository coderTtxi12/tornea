import { existsSync } from "node:fs";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

/** Misma cadena que `scripts/load-database-env.cjs` (Next.js). */
function loadDatabaseEnvFiles(): void {
  const root = process.cwd();
  const isProd = process.env.NODE_ENV === "production";
  const chain = isProd
    ? [".env", ".env.local", ".env.production", ".env.production.local"]
    : [".env", ".env.local", ".env.development", ".env.development.local"];
  for (const name of chain) {
    const p = resolve(root, name);
    if (existsSync(p)) {
      config({ path: p, override: true });
    }
  }
}

loadDatabaseEnvFiles();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://localhost:5432/tornea",
  },
  strict: true,
});
