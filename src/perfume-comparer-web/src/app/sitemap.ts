import type { MetadataRoute } from "next";
import { API_BASE, blogHref, brandHref, localeHref, perfumeHref, searchHref } from "@/lib/urls";
import { absoluteUrl } from "@/lib/seo";

interface SitemapData {
    perfumes: { path: string; updatedAt: string }[];
    brands: { slug: string; updatedAt: string }[];
    blogs: { slug: string; updatedAt: string }[];
}

/**
 * Tüm yayındaki parfüm, marka ve blog adreslerini listeler. Adresler asıl (canonical)
 * biçimdedir (/tr/...), yani hiçbiri yönlendirmeye uğramaz.
 *
 * Not: Tek sitemap dosyası en fazla 50.000 adres alabilir. Katalog bu sınıra
 * yaklaşırsa generateSitemaps ile parçalara bölünmeli.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: absoluteUrl(localeHref("/")), lastModified: now, changeFrequency: "daily", priority: 1.0 },
        { url: absoluteUrl(searchHref()), lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: absoluteUrl(localeHref("/karsilastir")), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
        { url: absoluteUrl(brandHref()), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
        { url: absoluteUrl(blogHref()), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ];

    let data: SitemapData | null = null;
    try {
        // Yanıt 2 MB'tan büyük, Next'in fetch önbelleğine sığmaz. Bu yüzden sitemap her
        // istekte üretilir; veritabanı yükünü API tarafındaki bir saatlik önbellek karşılar.
        const res = await fetch(`${API_BASE}/api/sitemap`, { cache: "no-store" });
        if (res.ok) data = await res.json();
    } catch {
        data = null;
    }

    // API'ye ulaşılamazsa en azından sabit sayfalar yayınlansın.
    if (!data) return staticPages;

    return [
        ...staticPages,
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
