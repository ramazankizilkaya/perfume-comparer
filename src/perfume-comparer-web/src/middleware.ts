import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n";

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Statik varlıklar, görseller, favicon ve dahili Next.js yollarını atla
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/media") ||
        pathname.startsWith("/stores") ||
        pathname.includes(".") // favicon.ico, .webp, .svg vb.
    ) {
        return NextResponse.next();
    }

    // İstek desteklenen bir dil ön ekiyle mi başlıyor? (örn: /tr, /tr/ara, /en)
    const matchedLocale = LOCALES.find(
        (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
    );

    if (matchedLocale) {
        // Tarayıcı URL'sinde /tr/... görünmeye devam eder,
        // Next.js dahili olarak ilgili sayfaya rewrite eder.
        let internalPath = pathname.replace(new RegExp(`^/${matchedLocale}`), "") || "/";

        // /ara yolunu /detayli-arama'ya yönlendir
        if (internalPath === "/ara" || internalPath.startsWith("/ara/")) {
            const redirectUrl = new URL(`/${matchedLocale}/detayli-arama${search}`, request.url);
            return NextResponse.redirect(redirectUrl, 301);
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

    // Dil ön eki bulunmayan istekleri varsayılan dile (/tr/...) yönlendir
    const cleanPathname = pathname === "/ara" ? "/detayli-arama" : pathname;
    const targetPath = `/${DEFAULT_LOCALE}${cleanPathname === "/" ? "" : cleanPathname}${search}`;
    const redirectUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(redirectUrl);
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
