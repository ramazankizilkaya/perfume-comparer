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
        const internalPath = pathname.replace(new RegExp(`^/${matchedLocale}`), "") || "/";
        const rewriteUrl = new URL(`${internalPath}${search}`, request.url);

        const response = NextResponse.rewrite(rewriteUrl);
        response.headers.set("x-locale", matchedLocale);
        return response;
    }

    // Dil ön eki bulunmayan istekleri varsayılan dile (/tr/...) yönlendir
    const targetPath = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}${search}`;
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
