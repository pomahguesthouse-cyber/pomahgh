import { useLocation } from "react-router-dom";
import { useSeoSettings } from "./useSeoSettings";
import { buildCanonicalUrl } from "@/utils/buildCanonicalUrl";

/**
 * Returns the canonical URL for the current page.
 *
 * The base URL is always read from `seo_settings.canonical_url` in the
 * database, so updating the site root in the admin panel propagates to
 * every canonical tag automatically.
 *
 * @param overridePath  Explicit path to use instead of the router's current
 *                      pathname.  Pass this from dynamic-route pages so the
 *                      canonical is stable and does not depend on
 *                      `window.location` (SSR-safe).
 *
 * @example
 * // Homepage
 * const canonical = useCanonicalUrl();
 * // → "https://www.pomahguesthouse.com"
 *
 * // Room detail page (pass the slug-based path explicitly)
 * const canonical = useCanonicalUrl(`/rooms/${roomSlug}`);
 * // → "https://www.pomahguesthouse.com/rooms/deluxe-room"
 */
export function useCanonicalUrl(overridePath?: string): string {
  const { pathname } = useLocation();
  const { settings } = useSeoSettings();

  return buildCanonicalUrl(settings?.canonical_url, overridePath ?? pathname);
}
