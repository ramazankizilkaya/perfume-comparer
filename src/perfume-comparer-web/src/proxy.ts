import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n";

/**
 * Dil ön eki yönetimi. Sitenin asıl adres biçimi /tr/... halidir:
 * - Ön eksiz adresler (/, /marka/dior) kalıcı (308) olarak /tr/... adresine yönlenir.
 * - /tr/... adresleri arka planda ön eksiz sayfaya rewrite edilir; tarayıcıda /tr kalır.
 * - Henüz çevirisi olmayan diller (/en/...) Türkçe içeriğin kopyası olmasın diye 404 döner.
 * - Eski /ara adresi kalıcı olarak /tr/detayli-arama'ya yönlenir.
 */
export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Statik varlıklar, görseller, favicon ve dahili Next.js yollarını atla
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/media") ||
        pathname.startsWith("/stores") ||
        /\.(ico|png|jpg|jpeg|webp|svg|gif|txt|xml|json|js|css|map|woff|woff2)$/i.test(pathname)
    ) {
        return NextResponse.next();
    }

    // İstek desteklenen bir dil ön ekiyle mi başlıyor? (örn: /tr, /tr/ara, /en)
    const matchedLocale = LOCALES.find(
        (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
    );

    if (matchedLocale) {
        // İngilizce sözlük hazır ama sayfalar hâlâ Türkçe; /en adresleri kopya içerik
        // üretmesin diye var olmayan bir iç yola rewrite edilir ve 404 döner.
        if (matchedLocale !== DEFAULT_LOCALE) {
            return NextResponse.rewrite(new URL("/__dil-hazir-degil", request.url));
        }

        let internalPath = pathname.replace(new RegExp(`^/${matchedLocale}`), "") || "/";

        // /ara yolunu /detayli-arama'ya kalıcı olarak yönlendir
        if (internalPath === "/ara" || internalPath.startsWith("/ara/")) {
            const redirectUrl = new URL(`/${matchedLocale}/detayli-arama${search}`, request.url);
            return NextResponse.redirect(redirectUrl, 308);
        }

        // /detayli-arama isteğini dahili olarak /ara sayfasına yönlendir
        if (internalPath === "/detayli-arama" || internalPath.startsWith("/detayli-arama/")) {
            internalPath = internalPath.replace(/^\/detayli-arama/, "/ara");
        }

        const rewriteUrl = new URL(`${internalPath}${search}`, request.url);

        const response = NextResponse.rewrite(rewriteUrl);
        response.headers.set("x-locale", matchedLocale);
        return response;
    }

    // Dil ön eki bulunmayan istekleri varsayılan dile (/tr/...) kalıcı olarak yönlendir
    const cleanPathname = pathname === "/ara" || pathname.startsWith("/ara/") ? "/detayli-arama" : pathname;
    const targetPath = `/${DEFAULT_LOCALE}${cleanPathname === "/" ? "" : cleanPathname}${search}`;
    const redirectUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
    matcher: [
        /*
         * Tüm yolları yakala, ancak statik dosyaları hariç tut:
         * - api
         * - _next/static (statik dosyalar)
         * - _next/image (görsel optimizasyon)
         * - favicon.ico
         * - media, stores
         */
        "/((?!api|_next/static|_next/image|favicon.ico|media|stores).*)",
    ],
};
