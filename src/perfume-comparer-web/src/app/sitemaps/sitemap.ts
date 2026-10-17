import type { MetadataRoute } from "next";
import { loadSitemapEntries, SITEMAP_CHUNK_SIZE, sitemapChunkCount } from "@/lib/sitemapData";

/**
 * Parçalı sitemap dosyaları: /sitemaps/sitemap/0.xml, /sitemaps/sitemap/1.xml ...
 * Yalnızca katalog 45.000 adresi aştığında /sitemap.xml indeksinden işaret edilir;
 * altındayken /sitemap.xml adresleri tek başına listeler (bkz. app/sitemap.xml/route.ts).
 */
export async function generateSitemaps(): Promise<{ id: number }[]> {
    try {
        const entries = await loadSitemapEntries();
        return Array.from({ length: sitemapChunkCount(entries.length) }, (_, i) => ({ id: i }));
    } catch {
        // Build sırasında API kapalıysa build durmasın; parça listesi istek anında yine doğru üretilir.
        return [{ id: 0 }];
    }
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
    const index = Number(await id);
    if (!Number.isInteger(index) || index < 0) return [];

    // API hatasında loadSitemapEntries fırlatır; yanıt 5xx olur, Google eski dosyayı kullanır.
    const entries = await loadSitemapEntries();
    return entries.slice(index * SITEMAP_CHUNK_SIZE, (index + 1) * SITEMAP_CHUNK_SIZE);
}
