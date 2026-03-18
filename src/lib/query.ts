export const queryKeys = {
  sitePages: {
    all: ["site-pages"] as const,
    homepage: ["site-pages", "homepage"] as const,
    menu: ["site-pages", "menu"] as const,
    byRoute: (routePath: string) => ["site-pages", "route", routePath] as const,
  },
  landingPage: (slug: string | undefined) => ["landing-page", slug ?? ""] as const,
  hotelSettingsLanding: ["hotel-settings", "landing"] as const,
};

export const queryPresets = {
  publicPage: {
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  },
  adminList: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  },
} as const;
