import type { Pool } from "pg";

export type DatabaseHealthStatus = "ok" | "skipped" | "error";

export type DatabaseHealthResult = {
  status: DatabaseHealthStatus;
  detail?: string;
};

export async function getDatabaseHealth(
  pool: Pool | null,
): Promise<DatabaseHealthResult> {
  if (!pool) {
    return {
      status: "skipped",
      detail: "DATABASE_URL is not set; the app runs without a Postgres connection.",
    };
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("SELECT 1 AS ping");
    return { status: "ok" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return { status: "error", detail };
  } finally {
    client?.release();
  }
}
