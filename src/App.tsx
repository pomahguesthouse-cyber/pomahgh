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
  isAdminOnlyPath,
  isAdminPath,
  isPublicHost,
  isPublicOnlyPath,
  buildAdminUrl,
  buildPublicUrl,
  stripAdminBasename,
} from "@/lib/domain";

/* ====================================================== */
/* Cross-domain redirects (synchronous, pre-render)        */
/* ====================================================== */

function applyCrossDomainRedirects(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, pathname, search, hash } = window.location;

  // Public domain → admin-only URLs must always live on admin.pomahguesthouse.com.
  if (isPublicHost(hostname)) {
    if (isAdminOnlyPath(pathname)) {
      window.location.replace(buildAdminUrl(pathname, search, hash));
      return true;
    }
  }

  // Admin domain → normalize legacy `/admin/...` paths to clean admin-subdomain paths.
  if (isAdminHost(hostname)) {
    if (isAdminPath(pathname)) {
      window.location.replace(`${stripAdminBasename(pathname)}${search}${hash}`);
      return true;
    }

    // Public-only content must stay on the public domain.
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
