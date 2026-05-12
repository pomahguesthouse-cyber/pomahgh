import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import PublicApp from "./PublicApp";
import AdminApp from "./AdminApp";
import {
  getSubdomain,
  isAdminHost,
  isPublicHost,
  isPublicOnlyPath,
  buildAdminUrl,
  buildPublicUrl,
} from "@/lib/domain";

/* ====================================================== */
/* Cross-domain redirects (synchronous, pre-render)        */
/* ====================================================== */

function applyCrossDomainRedirects(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, pathname, search, hash } = window.location;

  // Public domain → if someone hits a legacy `/admin/...` or `/app/...` URL, send them to admin subdomain
  if (isPublicHost(hostname)) {
    if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/app" || pathname.startsWith("/app/")) {
      window.location.replace(buildAdminUrl(pathname, search, hash));
      return true;
    }
  }

  // Admin domain → if a public-only path (e.g. /rooms/deluxe) is accessed, send to public
  if (isAdminHost(hostname)) {
    if (isPublicOnlyPath(pathname)) {
      window.location.replace(buildPublicUrl(pathname, search, hash));
      return true;
    }
  }

  return false;
}

/* ====================================================== */
/* Query Client */
/* ====================================================== */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/* ====================================================== */
/* App Root */
/* ====================================================== */

const App = () => {
  // If a cross-domain redirect fires, stop rendering — the browser navigation
  // is already in flight.
  if (applyCrossDomainRedirects()) return null;

  const subdomain = getSubdomain();

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {subdomain === "admin" ? <AdminApp /> : <PublicApp />}
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
