import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** First Zod issue per top-level field key (matches existing API shape). */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const seg = issue.path[0];
    if (typeof seg === "string" && errors[seg] === undefined) {
      errors[seg] = issue.message;
    }
  }
  return errors;
}

export function validationErrorResponse(
  fields: Record<string, string>,
  options?: { message?: string },
) {
  return NextResponse.json(
    { error: options?.message ?? "Validación", fields },
    { status: 400 },
  );
}

/** Zod safeParse failure → standard `{ error, fields }` JSON (400). */
export function validationErrorFromZod(
  error: ZodError,
  options?: { message?: string },
) {
  return validationErrorResponse(zodFieldErrors(error), options);
}
