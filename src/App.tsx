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

import { ENV_CONFIG } from "@/config/env";

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
  /* PUBLIC DOMAIN */
  /* ------------------------------------- */

  if (isPublicHost(hostname)) {
    // Admin pages must live on admin subdomain

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
  /* ADMIN DOMAIN */
  /* ------------------------------------- */

  if (isAdminHost(hostname)) {
    /* Legacy /admin/* cleanup */

    if (isAdminPath(pathname)) {
      window.location.replace(
        `${stripAdminPrefix(pathname)}${search}${hash}`,
      );

      return true;
    }

    /* Public-only pages */

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
  /* ------------------------------------- */
  /* Redirect before render */
  /* ------------------------------------- */

  if (applyCrossDomainRedirects()) {
    return null;
  }

  /* ------------------------------------- */
  /* Mode */
  /* ------------------------------------- */

  const mode = getAppMode();

  /* ------------------------------------- */
  /* Basename */
  /* ------------------------------------- */

  const basename =
    mode === "admin"
      ? getAdminBasename()
      : "/";

  /* ------------------------------------- */
  /* Debug */
  /* ------------------------------------- */

  if (import.meta.env.DEV) {
    console.log("ENV_CONFIG", ENV_CONFIG);

    console.log("MODE", mode);

    console.log(
      "HOST",
      window.location.hostname,
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>

        <BrowserRouter basename={basename}>

          <TooltipProvider>

            <Toaster />

            <Sonner />

            {/* ========================== */}
            {/* ADMIN APP */}
            {/* ========================== */}

            {mode === "admin" ? (
              <AdminApp />
            ) : (
              <PublicApp />
            )}

          </TooltipProvider>

        </BrowserRouter>

      </HelmetProvider>
    </QueryClientProvider>
  );
}