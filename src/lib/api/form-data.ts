/** Reads a string field from multipart/form body (empty string if missing). */
export function readFormString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}
