/**
 * Parfüm linkleri tek yerden kurulur.
 * Başına dil kodu eklenir (/tr/parfum/...). Böylece breadcrumb, kart ve arama
 * linkleri tutarlı ve çoklu dil uyumlu çalışır.
 */
export function localeHref(path: string, lang: string = "tr"): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `/${lang}${cleanPath === "/" ? "" : cleanPath}`;
}

export function perfumeHref(path?: string | null, fallbackSlug?: string | null, lang: string = "tr"): string {
    if (path && path.trim().length > 0) return `/${lang}/parfum/${path}`;
    if (fallbackSlug) return `/${lang}/parfum/${fallbackSlug}`;
    return `/${lang}`;
}

/**
 * Detaylı arama linki. Herkese açık adres /tr/detayli-arama'dır; eski /ara adresi
 * yalnızca yönlendirme olarak yaşar, bu yüzden iç linklerde hiç kullanılmaz.
 */
export function searchHref(params?: Record<string, string | null | undefined>, lang: string = "tr"): string {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
        if (value) sp.set(key, value);
    }
    const qs = sp.toString();
    return `/${lang}/detayli-arama${qs ? `?${qs}` : ""}`;
}

/** Blog linkleri: /tr/blog ve /tr/blog/<slug>. */
export function blogHref(slug?: string | null, lang: string = "tr"): string {
    return slug ? `/${lang}/blog/${slug}` : `/${lang}/blog`;
}

/** Karşılaştırma sayfası linki. */
export function compareHref(slug1?: string | null, slug2?: string | null, lang: string = "tr"): string {
    if (!slug1 || !slug2) return `/${lang}/karsilastir`;
    return `/${lang}/karsilastir?items=${encodeURIComponent(slug1)},${encodeURIComponent(slug2)}`;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5026";

/** Marka sayfası linki. */
export function brandHref(slug?: string | null, lang: string = "tr"): string {
    return slug ? `/${lang}/marka/${slug}` : `/${lang}/marka`;
}

/**
 * Görsel adresi. Scrape edilen görseller API'de duruyor ve veritabanında
 * "/media/..." gibi göreli yolla saklanıyor; başına API adresini ekliyoruz.
 * Zaten tam adres olanlara (blog kapakları) dokunmuyoruz.
 */
export function mediaUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** "Male" | "Female" | "Unisex" -> Türkçe etiket */
export function genderLabel(gender?: string | null): string {
    if (gender === "Male") return "Erkek";
    if (gender === "Female") return "Kadın";
    return "Unisex";
}

export function formatDate(value?: string | null): string {
    if (!value) return "";
    return new Date(value).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
