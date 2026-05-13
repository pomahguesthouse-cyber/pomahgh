/**
 * ======================================================
 * DOMAIN & ENVIRONMENT HELPERS
 * ======================================================
 *
 * Supports:
 * - public domain
 * - admin subdomain
 * - localhost development
 * - lovable preview deployments
 * - SPA routing
 * - admin/public separation
 * - cross-domain redirects
 *
 * Production:
 *   https://pomahguesthouse.com
 *   https://admin.pomahguesthouse.com
 *
 * Development:
 *   localhost:8080/admin/dashboard
 */

export type AppMode =
  | "admin"
  | "public";

/* ====================================================== */
/* Hosts */
/* ====================================================== */

export const MAIN_HOST =
  "pomahguesthouse.com";

export const WWW_HOST =
  "www.pomahguesthouse.com";

export const ADMIN_HOST =
  "admin.pomahguesthouse.com";

/* ====================================================== */
/* Admin Routes */
/* ====================================================== */

export const ADMIN_ROUTES = [
  "/dashboard",
  "/login",

  "/booking-calendar",

  "/manage-rooms",
  "/manage-bookings",

  "/invoice-management",

  "/hero-slides",
  "/facility-hero-slides",
  "/explore-hero-slides",

  "/facilities",
  "/nearby-locations",

  "/city-attractions",
  "/city-events",

  "/media-library",

  "/room-features",
  "/room-addons",

  "/promotions",

  "/chatbot",
  "/chatbot/guest",
  "/chatbot/admin",

  "/chat",

  "/multi-agent",

  "/bank-accounts",

  "/seo-settings",
  "/seo-agent",
  "/social-media-agent",

  "/competitor-analysis",

  "/system-settings",

  "/landing-editor",
  "/page-editor",

  "/mobile-dashboard",
  "/mobile-login",
];

/* ====================================================== */
/* Public Routes */
/* ====================================================== */

export const PUBLIC_ROUTE_PREFIXES = [
  "/rooms/",
  "/explore-semarang",
  "/events/",
  "/location/",
  "/penginapan/",
  "/guest-house/",
  "/homestay/",
];

/* ====================================================== */
/* Safe Window */
/* ====================================================== */

function safeWindow():
  | Window
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

/* ====================================================== */
/* Helpers */
/* ====================================================== */

export function normalizeHostname(
  hostname: string,
) {
  return hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export function getHostname() {
  return (
    safeWindow()?.location.hostname ||
    ""
  );
}

/* ====================================================== */
/* Host Detection */
/* ====================================================== */

export function isAdminHost(
  hostname = getHostname(),
) {
  return (
    normalizeHostname(hostname) ===
    ADMIN_HOST
  );
}

export function isPublicHost(
  hostname = getHostname(),
) {
  const normalized =
    normalizeHostname(hostname);

  return (
    normalized === MAIN_HOST
  );
}

/* ====================================================== */
/* App Mode */
/* ====================================================== */

export function getAppMode():
  AppMode {
  const w = safeWindow();

  if (!w) {
    return "public";
  }

  const hostname =
    normalizeHostname(
      w.location.hostname,
    );

  /* ---------------------------------- */
  /* Production */
  /* ---------------------------------- */

  if (hostname === ADMIN_HOST) {
    return "admin";
  }

  if (hostname === MAIN_HOST) {
    return "public";
  }

  /* ---------------------------------- */
  /* Dev / Preview fallback */
  /* ---------------------------------- */

  return w.location.pathname.startsWith(
    "/admin",
  )
    ? "admin"
    : "public";
}

/* ====================================================== */
/* Admin Basename */
/* ====================================================== */

export function getAdminBasename() {
  return isAdminHost()
    ? "/"
    : "/admin";
}

/* ====================================================== */
/* Legacy Admin Path */
/* ====================================================== */

export function isAdminPath(
  pathname: string,
) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

/* ====================================================== */
/* Admin Route Check */
/* ====================================================== */

export function isAdminRoute(
  pathname: string,
) {
  return ADMIN_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`,
      ),
  );
}

/* ====================================================== */
/* Public Route Check */
/* ====================================================== */

export function isPublicRoute(
  pathname: string,
) {
  /* IMPORTANT:
     prevent "/" from redirecting
     admin root accidentally.
  */

  if (pathname === "/") {
    return false;
  }

  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname.startsWith(prefix),
  );
}

/* ====================================================== */
/* Strip Legacy Admin Prefix */
/* ====================================================== */

export function stripAdminPrefix(
  pathname: string,
) {
  const cleaned = pathname.replace(
    /^\/admin(?=\/|$)/,
    "",
  );

  return cleaned || "/";
}

/* ====================================================== */
/* URL Builders */
/* ====================================================== */

export function buildAdminUrl(
  path: string,
  search = "",
  hash = "",
) {
  const cleanPath =
    stripAdminPrefix(path);

  return `https://${ADMIN_HOST}${cleanPath}${search}${hash}`;
}

export function buildPublicUrl(
  path: string,
  search = "",
  hash = "",
) {
  return `https://${MAIN_HOST}${path}${search}${hash}`;
}

/* ====================================================== */
/* Redirect Helpers */
/* ====================================================== */

export function redirectToAdmin(
  path = "/dashboard",
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.location.href =
    buildAdminUrl(path);
}

export function redirectToPublic(
  path = "/",
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.location.href =
    buildPublicUrl(path);
}

/* ====================================================== */
/* Debug */
/* ====================================================== */

export function debugDomainInfo() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  console.group(
    "Pomah Domain Debug",
  );

  console.log(
    "hostname:",
    window.location.hostname,
  );

  console.log(
    "pathname:",
    window.location.pathname,
  );

  console.log(
    "mode:",
    getAppMode(),
  );

  console.log(
    "isAdminHost:",
    isAdminHost(),
  );

  console.log(
    "isPublicHost:",
    isPublicHost(),
  );

  console.groupEnd();
}