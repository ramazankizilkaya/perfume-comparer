import { loadSitemapEntries, SITEMAP_CHUNK_SIZE, sitemapChunkCount, sitemapChunkUrl } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

/**
 * /sitemap.xml
 *
 * Katalog tek dosya sınırının (45.000 adres) altındaysa adresleri doğrudan bu dosya
 * listeler. Sınır aşılırsa bu dosya bir sitemap indeksine dönüşür ve adresler
 * /sitemaps/sitemap/N.xml parçalarına dağılır (bkz. app/sitemaps/sitemap.ts).
 * Next sitemap indeksini kendisi üretmediği için XML burada elle yazılır.
 *
 * API'ye ulaşılamazsa loadSitemapEntries hata fırlatır ve yanıt 5xx olur.
 */
export async function GET(): Promise<Response> {
    const entries = await loadSitemapEntries();

    const body =
        entries.length <= SITEMAP_CHUNK_SIZE
            ? renderUrlSet(entries)
            : renderIndex(sitemapChunkCount(entries.length));

    return new Response(body, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600",
        },
    });
}

type Entry = Awaited<ReturnType<typeof loadSitemapEntries>>[number];

function renderUrlSet(entries: Entry[]): string {
    const items = entries
        .map((e) => {
            const parts = [`<loc>${escapeXml(e.url)}</loc>`];
            if (e.lastModified) parts.push(`<lastmod>${toIso(e.lastModified)}</lastmod>`);
            if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
            if (typeof e.priority === "number") parts.push(`<priority>${e.priority.toFixed(1)}</priority>`);
            return `<url>${parts.join("")}</url>`;
        })
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function renderIndex(count: number): string {
    const items = Array.from({ length: count }, (_, i) => `<sitemap><loc>${escapeXml(sitemapChunkUrl(i))}</loc></sitemap>`).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

function toIso(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function escapeXml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
