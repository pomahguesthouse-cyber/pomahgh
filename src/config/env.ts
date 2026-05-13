import {
  getAppMode,
  isAdminHost,
} from "@/lib/domain";

export type AppEnvironment =
  | "development"
  | "production";

export interface AppConfig {
  mode: "admin" | "public";

  env: AppEnvironment;

  appUrl: string;

  apiUrl: string;

  assetsUrl: string;

  uploadsUrl: string;

  enableSEO: boolean;

  enableIndexing: boolean;

  enableAdminTools: boolean;
}

/* ====================================================== */
/* Environment */
/* ====================================================== */

const isDev =
  import.meta.env.DEV;

/* ====================================================== */
/* Host-based mode */
/* ====================================================== */

const mode = getAppMode();

/* ====================================================== */
/* Base URLs */
/* ====================================================== */

const PUBLIC_URL =
  "https://pomahguesthouse.com";

const ADMIN_URL =
  "https://admin.pomahguesthouse.com";

/* ====================================================== */
/* Assets */
/* ====================================================== */

const CDN_URL =
  "https://pfvcezyxyaqolrerlwdo.supabase.co/storage/v1/object/public";

/* ====================================================== */
/* Config */
/* ====================================================== */

export const ENV_CONFIG: AppConfig = {
  mode,

  env: isDev
    ? "development"
    : "production",

  appUrl:
    mode === "admin"
      ? ADMIN_URL
      : PUBLIC_URL,

  apiUrl:
    import.meta.env.VITE_API_URL ||
    PUBLIC_URL,

  assetsUrl: CDN_URL,

  uploadsUrl:
    `${CDN_URL}/uploads`,

  enableSEO:
    mode === "public",

  enableIndexing:
    mode === "public",

  enableAdminTools:
    mode === "admin",
};

/* ====================================================== */
/* Helpers */
/* ====================================================== */

export function getAppUrl() {
  return ENV_CONFIG.appUrl;
}

export function getAssetsUrl() {
  return ENV_CONFIG.assetsUrl;
}

export function isAdminEnvironment() {
  return ENV_CONFIG.mode === "admin";
}

export function isPublicEnvironment() {
  return ENV_CONFIG.mode === "public";
}