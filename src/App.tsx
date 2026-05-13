import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { HelmetProvider } from "react-helmet-async";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { BrowserRouter } from "react-router-dom";

import {
  buildAdminUrl,
  buildPublicUrl,
  getAppMode,
  getAdminBasename,
  isAdminHost,
  isAdminPath,
  isAdminRoute,
  isPublicHost,
  isPublicRoute,
  stripAdminPrefix,
} from "@/lib/domain";

import PublicApp from "./PublicApp";
import AdminApp from "./AdminApp";

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
/* Cross Domain Redirects */
/* ====================================================== */

function applyCrossDomainRedirects() {
  if (typeof window === "undefined") {
    return false;
  }

  const {
    hostname,
    pathname,
    search,
    hash,
  } = window.location;

  /* ------------------------------------- */
  /* Public domain */
  /* ------------------------------------- */

  if (isPublicHost(hostname)) {
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

      return true;
    }
  }

  /* ------------------------------------- */
  /* Admin domain */
  /* ------------------------------------- */

  if (isAdminHost(hostname)) {
    /* Legacy /admin/* cleanup */

    if (isAdminPath(pathname)) {
      window.location.replace(
        `${stripAdminPrefix(pathname)}${search}${hash}`,
      );

      return true;
    }

    /* Public-only content */

    if (isPublicRoute(pathname)) {
      window.location.replace(
        buildPublicUrl(
          pathname,
          search,
          hash,
        ),
      );

      return true;
    }
  }

  return false;
}

/* ====================================================== */
/* App */
/* ====================================================== */

export default function App() {
  /* ------------------------------------- */
  /* Redirect before render */
  /* ------------------------------------- */

  if (applyCrossDomainRedirects()) {
    return null;
  }

  const mode = getAppMode();

  /* ------------------------------------- */
  /* Basename */
  /* ------------------------------------- */

  const basename =
    mode === "admin"
      ? getAdminBasename()
      : "/";

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>

          <Toaster />
          <Sonner />

          <BrowserRouter basename={basename}>

            {/* ========================== */}
            {/* Admin App */}
            {/* ========================== */}

            {mode === "admin" ? (
              <AdminApp />
            ) : (
              <PublicApp />
            )}

          </BrowserRouter>

        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}