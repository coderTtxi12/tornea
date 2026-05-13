#!/usr/bin/env node
/**
 * Grants dashboard access to a Supabase Auth user by email:
 * upserts `public.users` and sets `dashboard_access_granted_at`.
 *
 * Prereq: the user must exist in `auth.users` (sign in with Google at least once).
 *
 * Usage:
 *   npm run db:seed:dashboard-user
 *   npm run db:seed:dashboard-user -- other@email.com
 */
const path = require("node:path");
const { Pool } = require("pg");

const root = path.resolve(__dirname, "..");
const { loadDatabaseEnv } = require("./load-database-env.cjs");
loadDatabaseEnv(root);

const email = (process.argv[2] || "texor228@gmail.com").trim();

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      "[db:seed:dashboard-user] DATABASE_URL is not set (revisá .env / .env.development.local).",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const authRes = await pool.query(
      `SELECT id, email, raw_user_meta_data
       FROM auth.users
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email],
    );

    if (authRes.rows.length === 0) {
      console.error(
        `[db:seed:dashboard-user] No auth.users row for "${email}".`,
      );
      console.error(
        "  Sign in with Google once so Supabase creates the auth user, then run this script again.",
      );
      process.exit(1);
    }

    const authUser = authRes.rows[0];
    const meta = authUser.raw_user_meta_data || {};
    const displayName =
      typeof meta.full_name === "string"
        ? meta.full_name
        : typeof meta.name === "string"
          ? meta.name
          : null;
    const avatarUrl =
      typeof meta.avatar_url === "string" ? meta.avatar_url : null;

    await pool.query(
      `INSERT INTO users (
        auth_user_id,
        email,
        display_name,
        avatar_url,
        locale,
        dashboard_access_granted_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'es', now(), now(), now())
      ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        dashboard_access_granted_at = now(),
        updated_at = now()`,
      [authUser.id, authUser.email, displayName, avatarUrl],
    );

    console.info(
      `[db:seed:dashboard-user] Granted dashboard access for ${authUser.email}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
