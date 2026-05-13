/**
 * PRODUCTION-READY DOMAIN & ROUTING HELPERS
 * ----------------------------------------
 * Supports:
 * - public domain
 * - admin subdomain
 * - localhost development
 * - lovable preview environments
 * - SPA routing
 * - SEO isolation
 * - admin/public boundary enforcement
 *
 * Domains:
 * - https://pomahguesthouse.com
 * - https://www.pomahguesthouse.com
 * - https://admin.pomahguesthouse.com
 */

export type AppMode = "admin" | "public";

/* ===================================================== */
/* HOST CONFIG */
/* ===================================================== */

export const MAIN_HOST =
  "pomahguesthouse.com";

export const WWW_HOST =
  "www.pomahguesthouse.com";

export const ADMIN_HOST =
  "admin.pomahguesthouse.com";

export const PROD_HOSTS = new Set([
  MAIN_HOST,
  WWW_HOST,
  ADMIN_HOST,
]);

/* ===================================================== */
/* ADMIN ROUTE CONFIG */
/* ===================================================== */

export const ADMIN_ROUTES = [
  "/dashboard",
  "/booking-calendar",
  "/rooms",
  "/bookings",
  "/hero-slides",
  "/facility-hero-slides",
  "/facilities",
  "/settings",
  "/invoice-management",
  "/nearby-locations",
  "/chatbot",
  "/chatbot/guest",
  "/chatbot/admin",
  "/chat",
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
];

/* ===================================================== */
/* PUBLIC ROUTE PREFIXES */
/* ===================================================== */

export const PUBLIC_ROUTE_PREFIXES = [
  "/rooms/",
  "/explore-semarang",
  "/events/",
  "/location/",
  "/penginapan/",
  "/guest-house/",
  "/homestay/",
];

/* ===================================================== */
/* SAFE WINDOW */
/* ===================================================== */

function safeWindow(): Window | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

/* ===================================================== */
/* HOST HELPERS */
/* ===================================================== */

export function normalizeHostname(
  hostname: string,
) {
  return hostname
    .toLowerCase()
    .replace(/\.$/, "");
}

export function getHostname() {
  return (
    safeWindow()?.location.hostname || ""
  );
}

export function isProdHost(
  hostname = getHostname(),
) {
  return PROD_HOSTS.has(
    normalizeHostname(hostname),
  );
}

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
    normalized === MAIN_HOST ||
    normalized === WWW_HOST
  );
}

/* ===================================================== */
/* APP MODE DETECTION */
/* ===================================================== */

export function getAppMode(): AppMode {
  const w = safeWindow();

  if (!w) {
    return "public";
  }

  const hostname = normalizeHostname(
    w.location.hostname,
  );

  /* ------------------------------------- */
  /* Production */
  /* ------------------------------------- */

  if (hostname === ADMIN_HOST) {
    return "admin";
  }

  if (
    hostname === MAIN_HOST ||
    hostname === WWW_HOST
  ) {
    return "public";
  }

  /* ------------------------------------- */
  /* Dev / Preview fallback */
  /* ------------------------------------- */

  return w.location.pathname.startsWith(
    "/admin",
  )
    ? "admin"
    : "public";
}

/* ===================================================== */
/* ADMIN BASE PATH */
/* ===================================================== */

export function getAdminBasename() {
  return isAdminHost()
    ? "/"
    : "/admin";
}

/* ===================================================== */
/* ADMIN PATH DETECTION */
/* ===================================================== */

export function isAdminPath(
  pathname: string,
) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

/* ===================================================== */
/* ADMIN ROUTE CHECK */
/* ===================================================== */

export function isAdminRoute(
  pathname: string,
) {
  return ADMIN_ROUTES.some((route) => {
    return (
      pathname === route ||
      pathname.startsWith(`${route}/`)
    );
  });
}

/* ===================================================== */
/* PUBLIC ROUTE CHECK */
/* ===================================================== */

export function isPublicRoute(
  pathname: string,
) {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => {
      return (
        pathname === prefix ||
        pathname.startsWith(prefix)
      );
    },
  );
}

/* ===================================================== */
/* CLEAN ADMIN PATH */
/* ===================================================== */

export function stripAdminPrefix(
  pathname: string,
) {
  const cleaned = pathname.replace(
    /^\/admin(?=\/|$)/,
    "",
  );

  return cleaned || "/";
}

/* ===================================================== */
/* URL BUILDERS */
/* ===================================================== */

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

/* ===================================================== */
/* REDIRECT HELPERS */
/* ===================================================== */

export function redirectToAdmin(
  path = "/dashboard",
) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href =
    buildAdminUrl(path);
}

export function redirectToPublic(
  path = "/",
) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href =
    buildPublicUrl(path);
}

/* ===================================================== */
/* DOMAIN BOUNDARY ENFORCEMENT */
/* ===================================================== */

export function enforceDomainBoundary() {
  const w = safeWindow();

  if (!w) {
    return;
  }

  const pathname =
    w.location.pathname;

  const search =
    w.location.search;

  const hash = w.location.hash;

  const mode = getAppMode();

  /* ------------------------------------- */
  /* PUBLIC DOMAIN */
  /* ------------------------------------- */

  if (mode === "public") {
    if (
      isAdminRoute(pathname) ||
      isAdminPath(pathname)
    ) {
      window.location.replace(
        buildAdminUrl(
          pathname,
          search,
          hash,
        ),
      );

      return;
    }
  }

  /* ------------------------------------- */
  /* ADMIN DOMAIN */
  /* ------------------------------------- */

  if (mode === "admin") {
    if (isPublicRoute(pathname)) {
      window.location.replace(
        buildPublicUrl(
          pathname,
          search,
          hash,
        ),
      );

      return;
    }
  }
}

/* ===================================================== */
/* ADMIN SEO PROTECTION */
/* ===================================================== */

export function injectAdminNoIndex() {
  if (
    typeof document === "undefined"
  ) {
    return;
  }

  if (getAppMode() !== "admin") {
    return;
  }

  let meta = document.querySelector(
    'meta[name="robots"]',
  );

  if (!meta) {
    meta =
      document.createElement("meta");

    meta.setAttribute(
      "name",
      "robots",
    );

    document.head.appendChild(meta);
  }

  meta.setAttribute(
    "content",
    "noindex,nofollow",
  );
}

/* ===================================================== */
/* DEBUG */
/* ===================================================== */

export function debugDomainInfo() {
  if (typeof window === "undefined") {
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