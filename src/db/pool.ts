import { Pool } from "pg";
import { getEnv } from "@/env";

let pool: Pool | undefined;

export function getPool(): Pool | null {
  const url = getEnv().DATABASE_URL;
  if (!url) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return pool;
}
