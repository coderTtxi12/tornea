import type { User } from "@supabase/supabase-js";

export function getDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta.full_name === "string" && meta.full_name) {
    return meta.full_name;
  }
  if (meta && typeof meta.name === "string" && meta.name) {
    return meta.name;
  }
  if (user.email) {
    return user.email;
  }
  return "Jugador";
}

export function getAvatarUrl(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta.avatar_url === "string" && meta.avatar_url) {
    return meta.avatar_url;
  }
  if (meta && typeof meta.picture === "string" && meta.picture) {
    return meta.picture;
  }
  return null;
}
