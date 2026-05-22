import { isSchemaDriftError } from "@/lib/db/pg-error-code";

export async function safeMatchDetailQuery<T>(
  run: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; schemaDrift: boolean }> {
  try {
    return { data: await run(), schemaDrift: false };
  } catch (err) {
    if (isSchemaDriftError(err)) {
      return { data: fallback, schemaDrift: true };
    }
    throw err;
  }
}
