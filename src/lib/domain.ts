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

const ADMIN_ONLY_EXACT_PATHS = new Set<string>([
  "/admin",
  "/app",
  "/dashboard",
  "/booking-calendar",
  "/rooms",
  "/hero-slides",
  "/facility-hero-slides",
  "/facilities",
  "/settings",
  "/invoice-management",
  "/nearby-locations",
  "/multi-agent",
  "/bank-accounts",
  "/room-features",
  "/room-addons",
  "/promotions",
  "/seo-settings",
  "/seo-agent",
  "/social-media-agent",
  "/page-editor",
  "/editor",
  "/media-library",
  "/city-attractions",
  "/explore-hero-slides",
  "/city-events",
  "/competitor-analysis",
]);

const ADMIN_ONLY_PREFIXES = ["/admin/", "/app/", "/chatbot/"];

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

export function getHostname(): string {
  return safeWindow()?.location.hostname ?? "";
}

export function isProdHost(hostname: string = getHostname()): boolean {
  return PROD_HOSTS.has(normalizeHostname(hostname));
}

export function isAdminHost(hostname: string = getHostname()): boolean {
  return normalizeHostname(hostname) === ADMIN_HOST;
}

export function isPublicHost(hostname: string = getHostname()): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized === MAIN_HOST || normalized === WWW_HOST;
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function stripAdminBasename(pathname: string): string {
  return pathname.replace(/^\/admin(?=\/|$)/, "") || "/";
}

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_EXACT_PATHS.has(pathname) || ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Detect which "app" should be rendered for the current location.
 *
 * Production: based on hostname.
 * Dev/preview: based on whether path starts with "/admin".
 */
export function getSubdomain(): Subdomain {
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
 * In production on the admin subdomain, basename is "/" (clean URLs).
 */
export function getAdminBasename(): string {
  return isAdminHost() ? "/" : "/admin";
}

/**
 * Build an absolute URL to the admin app, suitable for cross-domain redirects.
 * Strips a leading "/admin" from the path so e.g.
 *   buildAdminUrl("/admin/dashboard") → "https://admin.pomahguesthouse.com/dashboard"
 */
export function buildAdminUrl(path: string, search = "", hash = ""): string {
  const cleanPath = stripAdminBasename(path);
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
