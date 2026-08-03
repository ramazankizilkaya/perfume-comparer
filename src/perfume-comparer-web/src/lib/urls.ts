/**
 * Parfüm linkleri tek yerden kurulur.
 * API her kayıt için SEO yolunu (`path`) döndürür:
 *   "erkek/edp/dior/dior-homme-edp"
 * Burada başına /parfum ekliyoruz. Böylece breadcrumb, kart ve arama
 * linkleri asla birbirinden ayrışmaz.
 */
export function perfumeHref(path?: string | null, fallbackSlug?: string | null): string {
    if (path && path.trim().length > 0) return `/parfum/${path}`;
    if (fallbackSlug) return `/parfum/${fallbackSlug}`;
    return "/";
}

/** Karşılaştırma sayfası linki. */
export function compareHref(slug1?: string | null, slug2?: string | null): string {
    if (!slug1 || !slug2) return "/karsilastir";
    return `/karsilastir?items=${encodeURIComponent(slug1)},${encodeURIComponent(slug2)}`;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5026";

/** Marka sayfası linki. */
export function brandHref(slug?: string | null): string {
    return slug ? `/marka/${slug}` : "/marka";
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
