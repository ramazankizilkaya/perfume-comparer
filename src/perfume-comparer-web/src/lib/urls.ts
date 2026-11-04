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

/** Gizlilik politikası ve KVKK aydınlatma metni: /tr/gizlilik-politikasi. */
export function privacyHref(lang: string = "tr"): string {
    return `/${lang}/gizlilik-politikasi`;
}

/** İletişim sayfası ve formu: /tr/iletisim. */
export function contactHref(lang: string = "tr"): string {
    return `/${lang}/iletisim`;
}

/** Karşılaştırma sayfası linki. */
export function compareHref(slug1?: string | null, slug2?: string | null, lang: string = "tr"): string {
    if (!slug1 || !slug2) return `/${lang}/karsilastir`;
    return `/${lang}/karsilastir?items=${encodeURIComponent(slug1)},${encodeURIComponent(slug2)}`;
}

/**
 * Adres çubuğundaki tek kullanımlık aksiyon parametresini (ör. ?write=1)
 * okur ve eşleşirse URL'den sessizce temizleyip true döndürür.
 */
export function consumeUrlParam(key: string, expectedValue?: string): boolean {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    const val = sp.get(key);
    if (val === null) return false;
    if (expectedValue !== undefined && val !== expectedValue) return false;

    sp.delete(key);
    const qs = sp.toString();
    const cleanUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", cleanUrl);
    return true;
}

/** Kullanıcının kendi blog yazıları: /tr/blog/yazilarim */
export function myBlogsHref(lang: string = "tr"): string {
    return `/${lang}/blog/yazilarim`;
}

/** Blog önizleme: /tr/blog/onizleme */
export function blogPreviewHref(lang: string = "tr"): string {
    return `/${lang}/blog/onizleme`;
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** .env'deki API adresi (sonundaki / atılır). Canlıda build kontrolü bunun gerçek bir adres olmasını zorunlu tutar. */
const CONFIGURED_API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5026").replace(/\/+$/, "");

/**
 * API adresi.
 * - Canlıda (NODE_ENV=production) sunucu da tarayıcı da NEXT_PUBLIC_API_BASE'i kullanır.
 * - Geliştirmede tarayıcı göreli adres ("") kullanır: /api ve /media istekleri
 *   next.config.ts'teki rewrite'lar üzerinden yerel API'ye gider. Böylece telefondan
 *   veya ngrok üzerinden bağlanınca da görseller ve API çalışır. Sunucu tarafı ise
 *   her zaman tam adresi kullanır.
 */
export const API_BASE = !IS_PRODUCTION && typeof window !== "undefined" ? "" : CONFIGURED_API_BASE;

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
    const relative = path.startsWith("/") ? path : `/${path}`;
    // Geliştirmede hem SSR hem tarayıcı göreli yol üretir (hydration farkı olmaz) ve
    // görsel next.config.ts'teki /media rewrite'ı ile yerel API'den gelir.
    if (!IS_PRODUCTION) return relative;
    return `${CONFIGURED_API_BASE}${relative}`;
}

/** "Male" | "Female" | "Unisex" -> Türkçe etiket */
export function genderLabel(gender?: string | null): string {
    if (gender === "Male") return "Erkek";
    if (gender === "Female") return "Kadın";
    return "Unisex";
}

export function formatDate(value?: string | null): string {
    if (!value) return "";
    // Sunucunun saat dilimi ne olursa olsun tarih Türkiye saatine göre basılır;
    // aksi halde gece yarısına yakın yayınlanan yazılar bir gün geride görünür.
    return new Date(value).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Istanbul",
    });
}
