/**
 * Domain & subdomain detection helpers.
 *
 * Production hosts:
 *   - pomahguesthouse.com / www.pomahguesthouse.com → "public"
 *   - admin.pomahguesthouse.com                     → "admin"
 *
 * Dev / preview hosts (localhost, *.lovable.app, *.lovableproject.com, etc.):
 *   - URL path starting with "/admin" → treated as "admin"
 *   - otherwise → treated as "public"
 *
 * This lets developers test admin pages locally by visiting `/admin/...`
 * while production uses subdomain-based isolation.
 */

export type Subdomain = "admin" | "public";

export const ADMIN_HOST = "admin.pomahguesthouse.com";
export const MAIN_HOST = "pomahguesthouse.com";
export const WWW_HOST = "www.pomahguesthouse.com";

const PROD_HOSTS = new Set<string>([ADMIN_HOST, MAIN_HOST, WWW_HOST]);

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

export function getHostname(): string {
  return safeWindow()?.location.hostname ?? "";
}

export function isProdHost(hostname: string = getHostname()): boolean {
  return PROD_HOSTS.has(hostname);
}

export function isAdminHost(hostname: string = getHostname()): boolean {
  return hostname === ADMIN_HOST;
}

export function isPublicHost(hostname: string = getHostname()): boolean {
  return hostname === MAIN_HOST || hostname === WWW_HOST;
}

/**
 * Detect which "app" should be rendered for the current location.
 *
 * If VITE_ADMIN_ONLY=true (set in the admin-only Lovable project), always
 * renders the admin app regardless of hostname — this powers the separate
 * admin.pomahguesthouse.com Lovable deployment.
 *
 * Production: based on hostname.
 * Dev/preview: based on whether path starts with "/admin".
 */
export function getSubdomain(): Subdomain {
  // Admin-only build (separate Lovable project for admin.pomahguesthouse.com)
  if (import.meta.env.VITE_ADMIN_ONLY === "true") return "admin";

  const w = safeWindow();
  if (!w) return "public";

  const hostname = w.location.hostname;

  if (isAdminHost(hostname)) return "admin";
  if (isPublicHost(hostname)) return "public";

  // Dev/preview fallback: use path prefix
  return w.location.pathname.startsWith("/admin") ? "admin" : "public";
}

/**
 * In dev/preview, admin routes are mounted under `/admin` basename so the
 * router can use clean paths internally while developers visit `/admin/...`.
 * In production on the admin subdomain (or admin-only build), basename is "/".
 */
export function getAdminBasename(): string {
  if (import.meta.env.VITE_ADMIN_ONLY === "true") return "/";
  return isAdminHost() ? "/" : "/admin";
}

/**
 * Build an absolute URL to the admin app, suitable for cross-domain redirects.
 * Strips a leading "/admin" from the path so e.g.
 *   buildAdminUrl("/admin/dashboard") → "https://admin.pomahguesthouse.com/dashboard"
 */
export function buildAdminUrl(path: string, search = "", hash = ""): string {
  const cleanPath = path.replace(/^\/admin(?=\/|$)/, "") || "/";
  return `https://${ADMIN_HOST}${cleanPath}${search}${hash}`;
}

/**
 * Build an absolute URL to the public site.
 */
export function buildPublicUrl(path: string, search = "", hash = ""): string {
  return `https://${MAIN_HOST}${path}${search}${hash}`;
}

/**
 * Path prefixes that — even on the admin subdomain — must redirect to public.
 * Useful when someone navigates from the admin app to a public page via a stale link.
 */
const PUBLIC_ONLY_PATHS = [
  "/rooms/",
  "/explore-semarang",
  "/events/",
  "/location/",
  "/penginapan/",
  "/guest-house/",
  "/homestay/",
];

export function isPublicOnlyPath(pathname: string): boolean {
  return PUBLIC_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}
