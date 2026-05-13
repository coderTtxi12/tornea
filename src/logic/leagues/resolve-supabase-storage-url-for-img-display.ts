import { playerProfileImageUrl } from "@/lib/players/player-profile-photo";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Misma ventana que los escudos de liga en el dashboard. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function playerPhotoBucketAndPath(metadata: unknown): { bucket: string; path: string } | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).photo;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const bucket = typeof o.bucket === "string" ? o.bucket.trim() : "";
  const path = typeof o.path === "string" ? o.path.replace(/^\/+/, "").trim() : "";
  if (!bucket || !path) return null;
  return { bucket, path };
}

/**
 * Foto de jugador: `metadata.photo` guarda `{ bucket, path, publicUrl }` (PlayerFileRef).
 * Igual que los escudos, firmamos con `bucket` + `path`; parsear solo `publicUrl` falla si la URL
 * no coincide con el patrón esperado (p. ej. otro host o forma de path).
 */
export async function resolvePlayerPhotoForImgDisplay(metadata: unknown): Promise<string | null> {
  const ref = playerPhotoBucketAndPath(metadata);
  const service = createServiceRoleClient();
  if (ref && service) {
    try {
      const { data, error } = await service.storage
        .from(ref.bucket)
        .createSignedUrl(ref.path, SIGNED_URL_TTL_SECONDS);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
      /* fallback */
    }
  }
  const fromPublicField = playerProfileImageUrl(metadata);
  return resolveSupabaseStorageUrlForImgDisplay(fromPublicField);
}

function playerCurpBucketAndPath(metadata: unknown): { bucket: string; path: string } | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).curp;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const bucket = typeof o.bucket === "string" ? o.bucket.trim() : "";
  const path = typeof o.path === "string" ? o.path.replace(/^\/+/, "").trim() : "";
  if (!bucket || !path) return null;
  return { bucket, path };
}

function curpPublicUrlFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).curp;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const camel = typeof o.publicUrl === "string" ? o.publicUrl.trim() : "";
  const snake = typeof o.public_url === "string" ? o.public_url.trim() : "";
  return camel || snake || null;
}

/**
 * URL firmada (o pública resuelta) para descargar el archivo CURP en `metadata.curp`.
 */
export async function resolvePlayerCurpForDownload(metadata: unknown): Promise<string | null> {
  const ref = playerCurpBucketAndPath(metadata);
  const service = createServiceRoleClient();
  if (ref && service) {
    try {
      const { data, error } = await service.storage
        .from(ref.bucket)
        .createSignedUrl(ref.path, SIGNED_URL_TTL_SECONDS);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
      /* fallback */
    }
  }
  return resolveSupabaseStorageUrlForImgDisplay(curpPublicUrlFromMetadata(metadata));
}

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
