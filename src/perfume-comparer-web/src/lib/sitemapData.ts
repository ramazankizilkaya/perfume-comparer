import type { MetadataRoute } from "next";
import { apiError, apiFetch } from "./api";
import { absoluteUrl } from "./seo";
import { blogHref, brandHref, localeHref, perfumeHref, privacyHref, searchHref } from "./urls";

/** Tek bir sitemap dosyasına yazılacak en fazla adres (Google sınırı 50.000; pay bırakıldı). */
export const SITEMAP_CHUNK_SIZE = 45000;

interface SitemapData {
    perfumes: { path: string; updatedAt: string }[];
    brands: { slug: string; updatedAt: string }[];
    blogs: { slug: string; updatedAt: string }[];
}

/**
 * Sabit sayfalar. lastModified verilmez: her istekte "şimdi" yazmak Google için
 * anlamsız bir sinyaldir; gerçek bir değişiklik tarihi olmadığında alan boş kalır.
 */
const STATIC_PAGES: MetadataRoute.Sitemap = [
    { url: absoluteUrl(localeHref("/")), changeFrequency: "daily", priority: 1.0 },
    { url: absoluteUrl(searchHref()), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl(localeHref("/karsilastir")), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl(brandHref()), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl(blogHref()), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl(privacyHref()), changeFrequency: "yearly", priority: 0.2 },
];

/**
 * Tüm yayındaki parfüm, marka ve blog adreslerini asıl (canonical) biçimde (/tr/...)
 * ve her çağrıda aynı sırada döner; böylece parçalara bölündüğünde her adres tek bir
 * parçada yer alır.
 *
 * API'ye ulaşılamazsa HATA FIRLATIR: Next 5xx döner ve Google elindeki eski sitemap'i
 * kullanmaya devam eder. Sessizce 5 adreslik "sağlam" bir sitemap dönmek, Google'a
 * 22 bin adresin silindiğini söylemek olurdu.
 *
 * Yanıt 2 MB'tan büyük olduğu için Next fetch önbelleğine girmez (no-store); veritabanı
 * yükünü API tarafındaki bir saatlik IMemoryCache karşılar.
 */
export async function loadSitemapEntries(): Promise<MetadataRoute.Sitemap> {
    const res = await apiFetch("/api/sitemap", { cache: "no-store" });
    if (!res.ok) throw apiError(res, "Sitemap verisi alınamadı");
    const data: SitemapData = await res.json();

    return [
        ...STATIC_PAGES,
        ...data.brands.map((b) => ({
            url: absoluteUrl(brandHref(b.slug)),
            lastModified: new Date(b.updatedAt),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        })),
        ...data.blogs.map((b) => ({
            url: absoluteUrl(blogHref(b.slug)),
            lastModified: new Date(b.updatedAt),
            changeFrequency: "monthly" as const,
            priority: 0.6,
        })),
        ...data.perfumes.map((p) => ({
            url: absoluteUrl(perfumeHref(p.path)),
            lastModified: new Date(p.updatedAt),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        })),
    ];
}

export function sitemapChunkCount(total: number): number {
    return Math.max(1, Math.ceil(total / SITEMAP_CHUNK_SIZE));
}

/** Parçalı sitemap dosyasının adresi: /sitemaps/sitemap/0.xml, /sitemaps/sitemap/1.xml ... */
export function sitemapChunkUrl(index: number): string {
    return absoluteUrl(`/sitemaps/sitemap/${index}.xml`);
}
