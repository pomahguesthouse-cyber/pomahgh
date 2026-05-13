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
/* Redirects */
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

  /* PUBLIC DOMAIN */

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

  /* ADMIN DOMAIN */

  if (isAdminHost(hostname)) {
    if (isAdminPath(pathname)) {
      window.location.replace(
        `${stripAdminPrefix(pathname)}${search}${hash}`,
      );

      return true;
    }

    if (
      pathname !== "/" &&
      isPublicRoute(pathname)
    ) {
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
  if (applyCrossDomainRedirects()) {
    return null;
  }

  const mode = getAppMode();

  const basename =
    mode === "admin"
      ? getAdminBasename()
      : "/";

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>

        {/* IMPORTANT:
            Radix providers OUTSIDE router
        */}

        <TooltipProvider>

          <Toaster />

          <Sonner />

          <BrowserRouter basename={basename}>

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