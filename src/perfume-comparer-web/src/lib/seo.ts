import type { Metadata } from "next";

/**
 * SEO ayarları tek yerden kurulur.
 *
 * Sitenin asıl (canonical) adres biçimi dil ön ekli halidir: /tr/parfum/..., /tr/marka/...
 * Canonical, Open Graph, JSON-LD ve sitemap adresleri hep bu dosyadaki yardımcılarla
 * üretilir; böylece Google'a hiçbir yerde yönlendirilen bir adres bildirilmez.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auracompare.com").replace(/\/+$/, "");
export const SITE_NAME = "Aura Compare";
export const DEFAULT_OG_IMAGE = "/og-default.png";
export const LOGO_URL = `${SITE_URL}/logo.png`;

/** Göreli bir yolu (örn. "/tr/marka/dior") tam adrese çevirir. */
export function absoluteUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageMetadataInput {
    /** Site adı eklenmemiş başlık; " | Aura Compare" kök şablondan gelir. */
    title: string;
    description: string;
    /** Dil ön ekli asıl yol, örn. "/tr/parfum/erkek/edp/dior/sauvage". */
    path: string;
    images?: (string | undefined | null)[];
    type?: "website" | "article";
    publishedTime?: string;
    modifiedTime?: string;
    noIndex?: boolean;
    /** true ise başlığa site adı şablonu eklenmez (anasayfa gibi). */
    absoluteTitle?: boolean;
}

/**
 * Bir sayfanın title, description, canonical, Open Graph ve Twitter etiketlerini
 * birlikte üretir. Next.js metadata'yı üst katmanla sığ birleştirdiği için
 * openGraph alanının tamamı her sayfada yeniden verilir.
 */
export function pageMetadata({
    title,
    description,
    path,
    images,
    type = "website",
    publishedTime,
    modifiedTime,
    noIndex = false,
    absoluteTitle = false,
}: PageMetadataInput): Metadata {
    const imageList = (images ?? []).filter((i): i is string => Boolean(i));
    const ogImages = imageList.length > 0 ? imageList : [DEFAULT_OG_IMAGE];
    const socialTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

    return {
        title: absoluteTitle ? { absolute: title } : title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type,
            locale: "tr_TR",
            siteName: SITE_NAME,
            url: path,
            title: socialTitle,
            description,
            images: ogImages,
            ...(type === "article" && publishedTime ? { publishedTime } : {}),
            ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: socialTitle,
            description,
            images: ogImages,
        },
        ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    };
}

/** Kullanıcıya özel veya yönetim sayfaları için: indekslenmez, linkler takip edilir. */
export const NO_INDEX: Metadata = { robots: { index: false, follow: true } };

/** Düz metin açıklamayı meta description için ~160 karaktere indirir. */
export function truncateDescription(text: string, max = 160): string {
    const clean = text
        .replace(/<[^>]+>/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#*_`>]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** JSON-LD'yi <script> içine güvenle gömmek için "</" dizisini kaçırır. */
export function jsonLd(data: unknown): string {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}
