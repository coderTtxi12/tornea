import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Misma ventana que los escudos de liga en el dashboard. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * URLs de `getPublicUrl` tienen forma
 * `.../storage/v1/object/public/<bucket>/<path>`. Si el bucket es privado, el navegador no puede
 * cargar esa URL; generamos una signed URL con service role cuando sea posible.
 */
const SUPABASE_PUBLIC_OBJECT_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;

export async function resolveSupabaseStorageUrlForImgDisplay(
  url: string | null | undefined,
): Promise<string | null> {
  if (url == null || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.includes("/object/sign/")) {
    return trimmed;
  }

  const m = trimmed.match(SUPABASE_PUBLIC_OBJECT_RE);
  if (!m) {
    return trimmed;
  }

  const bucket = m[1];
  const pathWithPossibleQuery = m[2];
  if (!pathWithPossibleQuery) return trimmed;

  const encodedPath = pathWithPossibleQuery.split("?")[0] ?? pathWithPossibleQuery;
  let objectPath: string;
  try {
    objectPath = decodeURIComponent(encodedPath);
  } catch {
    objectPath = encodedPath;
  }

  const service = createServiceRoleClient();
  if (!service) {
    return trimmed;
  }

  try {
    const { data, error } = await service.storage
      .from(bucket)
      .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    /* usar URL original */
  }

  return trimmed;
}
