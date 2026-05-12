import { semarangAreas } from "@/data/semarangAreas";

export function generateSitemapXml() {
  const base =
    "https://pomahguesthouse.com";

  const urls = semarangAreas.map(
    (area) => `
      <url>
        <loc>${base}/location/${area.slug}</loc>
      </url>
    `,
  );

  return `
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    >
      ${urls.join("")}
    </urlset>
  `;
}