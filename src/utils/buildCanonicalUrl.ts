const FALLBACK_BASE = "https://www.pomahguesthouse.com";

/** Strips trailing slashes from a URL base. */
export function normalizeBaseUrl(raw: string | undefined | null): string {
  return (raw || FALLBACK_BASE).replace(/\/+$/, "");
}

/**
 * Builds a page-specific canonical URL.
 *
 * Rules:
 * - `baseUrl` is always treated as the site root (trailing slash stripped).
 * - `pathname === "/"` → returns the bare base URL (no trailing slash).
 * - Any other pathname has its own trailing slash stripped and is appended
 *   with a single "/" separator, preventing double-slash bugs.
 *
 * @param baseUrl  Site root from SEO settings, e.g. "https://www.pomahguesthouse.com"
 * @param pathname Current or explicit page path, e.g. "/rooms/deluxe-room"
 *
 * @example
 * buildCanonicalUrl("https://www.pomahguesthouse.com", "/")
 * // → "https://www.pomahguesthouse.com"
 *
 * buildCanonicalUrl("https://www.pomahguesthouse.com/", "/rooms/deluxe-room/")
 * // → "https://www.pomahguesthouse.com/rooms/deluxe-room"
 *
 * buildCanonicalUrl(undefined, "/explore-semarang/lawang-sewu")
 * // → "https://www.pomahguesthouse.com/explore-semarang/lawang-sewu"
 */
export function buildCanonicalUrl(
  baseUrl: string | undefined | null,
  pathname: string,
): string {
  const base = normalizeBaseUrl(baseUrl);

  if (!pathname || pathname === "/") return base;

  // Strip trailing slash from the path segment.
  const path = pathname.replace(/\/+$/, "");

  // Guarantee exactly one "/" between base and path.
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
