import { ReactNode } from "react";

interface SubdomainRouterProps {
  children: ReactNode;
}

const ADMIN_HOST = "admin.pomahguesthouse.com";
const MAIN_HOST = "pomahguesthouse.com";
const WWW_HOST = "www.pomahguesthouse.com";

// Path prefixes yang HANYA boleh diakses di admin subdomain
const ADMIN_ONLY_PREFIXES = ["/admin", "/app"];

// Path yang boleh di kedua domain (auth, manager link, dll)
const SHARED_PREFIXES = ["/auth", "/manager"];

function isAdminHost(hostname: string) {
  return hostname === ADMIN_HOST;
}

function isMainHost(hostname: string) {
  return hostname === MAIN_HOST || hostname === WWW_HOST;
}

function pathStartsWith(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p));
}

/**
 * SubdomainRouter
 *
 * Production:
 *   - admin.pomahguesthouse.com → hanya menyajikan /admin/*, /app/*, /auth, /manager
 *     - "/" otomatis redirect ke /admin
 *     - Path publik (mis. /rooms/xxx) di-redirect ke main domain
 *   - pomahguesthouse.com / www → menyajikan halaman publik
 *     - /admin/* dan /app/* di-redirect ke admin subdomain
 *
 * Dev / preview (localhost, *.lovable.app, dll) → tidak ada redirect, semua path bekerja.
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  if (typeof window !== "undefined") {
    const { hostname, pathname, search, hash } = window.location;

    // --- Admin subdomain ---
    if (isAdminHost(hostname)) {
      // "/" → /admin (halaman login admin)
      if (pathname === "/") {
        window.location.replace("/admin" + search + hash);
        return null;
      }

      const isAdminPath = pathStartsWith(pathname, ADMIN_ONLY_PREFIXES);
      const isSharedPath = pathStartsWith(pathname, SHARED_PREFIXES);

      if (!isAdminPath && !isSharedPath) {
        // Halaman publik diakses dari admin subdomain → lempar ke main domain
        window.location.replace(`https://${MAIN_HOST}${pathname}${search}${hash}`);
        return null;
      }
    }

    // --- Main domain ---
    if (isMainHost(hostname)) {
      if (pathStartsWith(pathname, ADMIN_ONLY_PREFIXES)) {
        // Halaman admin diakses dari main domain → lempar ke admin subdomain
        window.location.replace(`https://${ADMIN_HOST}${pathname}${search}${hash}`);
        return null;
      }
    }
  }

  return <>{children}</>;
}
