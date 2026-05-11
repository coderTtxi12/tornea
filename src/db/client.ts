import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  /** Preserve pool across Next.js dev HMR. */
  // eslint-disable-next-line no-var
  var __torneaPgPool: Pool | undefined;
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (globalThis.__torneaPgPool) {
    return globalThis.__torneaPgPool;
  }
  const pool = new Pool({ connectionString: url, max: 10 });
  globalThis.__torneaPgPool = pool;
  return pool;
}

let dbSingleton: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (!dbSingleton) {
    dbSingleton = drizzle(getPool(), { schema });
  }
  return dbSingleton;
}

export type Db = NodePgDatabase<typeof schema>;
