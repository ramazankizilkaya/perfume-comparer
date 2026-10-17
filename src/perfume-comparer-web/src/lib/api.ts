import { API_BASE } from "./urls";

/**
 * Sunucu tarafı API çağrıları tek yerden geçer (server component, generateMetadata,
 * sitemap, route handler). Ortamda API_INTERNAL_KEY tanımlıysa her isteğe
 * `X-Internal-Key` başlığı eklenir; API bu başlığı gören istekleri IP bazlı hız
 * sınırından muaf tutar (Next sunucusunun tek IP'si bütün ziyaretçiler adına istek atar).
 *
 * Anahtar NEXT_PUBLIC_ ile başlamaz, yani tarayıcıya hiç gitmez. Bu yüzden bu
 * yardımcı yalnızca sunucuda çalışır; tarayıcıdan çağrılırsa hata fırlatır.
 */
export function apiFetch(
    path: string,
    init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {},
): Promise<Response> {
    if (typeof window !== "undefined") {
        throw new Error("apiFetch yalnızca sunucu tarafında kullanılır.");
    }

    const headers = new Headers(init.headers);
    const key = process.env.API_INTERNAL_KEY;
    if (key && !headers.has("X-Internal-Key")) headers.set("X-Internal-Key", key);

    return fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers });
}

/** error.tsx bu digest'i görünce "çok yoğun istek" mesajı gösterir. */
export const RATE_LIMIT_DIGEST = "API_RATE_LIMITED";

/**
 * Başarısız bir API yanıtını, fırlatılacak hataya çevirir. 429 (hız sınırı) için
 * hataya sabit bir `digest` yazılır; Next bu alanı canlıda da olduğu gibi istemciye
 * taşır, böylece error.tsx geçici yoğunluğu genel bir arızadan ayırt edebilir.
 */
export function apiError(res: Response, what: string): Error {
    const err: Error & { digest?: string } = new Error(`${what}: ${res.status}`);
    if (res.status === 429) err.digest = RATE_LIMIT_DIGEST;
    return err;
}
