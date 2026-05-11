/**
 * Canonical URLs for Supabase Auth `redirectTo` (OAuth, magic links, etc.).
 * @see https://supabase.com/docs/guides/auth/redirect-urls
 */

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  const withProtocol = trimmed.startsWith("http")
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

/**
 * Site origin from environment only (SSR, Route Handlers, middleware).
 * Prefer {@link getAuthRedirectOrigin} in the browser so previews and custom domains
 * match the URL the user actually loaded.
 */
export function getSiteUrlFromEnv(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  return normalizeBaseUrl(url);
}

/**
 * Origin to embed in `redirectTo`. Uses `window` when available so each deployment
 * (localhost, Vercel preview, production, custom domain) matches Supabase allow-list patterns.
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return getSiteUrlFromEnv();
}

/** Absolute URL for the PKCE OAuth callback route. */
export function getAuthCallbackUrl(nextPath = "/dashboard"): string {
  const origin = getAuthRedirectOrigin();
  const qs = new URLSearchParams({ next: nextPath }).toString();
  return `${origin}/auth/callback?${qs}`;
}
