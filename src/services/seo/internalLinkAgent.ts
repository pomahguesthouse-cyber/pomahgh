import { semarangAreas } from "@/data/semarangAreas";

export function getRelatedAreas(
  currentSlug: string,
) {
  return semarangAreas.filter(
    (a) => a.slug !== currentSlug,
  );
}