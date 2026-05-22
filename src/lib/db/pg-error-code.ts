/** PostgreSQL `code` from Drizzle/node-pg error chains (e.g. `42P01` undefined_table). */
export function pgErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let depth = 0; depth < 8 && cur != null; depth++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      typeof (cur as { code: unknown }).code === "string"
    ) {
      return (cur as { code: string }).code;
    }
    if (typeof cur === "object" && cur !== null && "cause" in cur) {
      cur = (cur as { cause: unknown }).cause;
    } else {
      break;
    }
  }
  return undefined;
}

export function isMissingRelationError(err: unknown): boolean {
  return pgErrorCode(err) === "42P01";
}

/** Column listed in Drizzle schema but absent in DB (partial 0003 apply). */
export function isMissingColumnError(err: unknown): boolean {
  return pgErrorCode(err) === "42703";
}

export function isSchemaDriftError(err: unknown): boolean {
  return isMissingRelationError(err) || isMissingColumnError(err);
}
