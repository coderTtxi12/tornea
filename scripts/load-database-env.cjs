/**
 * Alinea la carga de variables con Next.js (`next dev` / `next start`).
 * Ver: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 *
 * Orden (cada archivo pisa claves anteriores si existe):
 * - desarrollo (default si NODE_ENV ≠ production): .env → .env.local → .env.development → .env.development.local
 * - producción (NODE_ENV === production): .env → .env.local → .env.production → .env.production.local
 */
const path = require("node:path");
const fs = require("node:fs");
const { config } = require("dotenv");

/**
 * @param {string} rootDir - raíz del repo (donde están los .env*)
 */
function loadDatabaseEnv(rootDir) {
  const isProd = process.env.NODE_ENV === "production";
  const chain = isProd
    ? [".env", ".env.local", ".env.production", ".env.production.local"]
    : [".env", ".env.local", ".env.development", ".env.development.local"];

  for (const name of chain) {
    const p = path.join(rootDir, name);
    if (fs.existsSync(p)) {
      config({ path: p, override: true });
    }
  }
}

module.exports = { loadDatabaseEnv };
