import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import ScrollToTop from "@/components/ScrollToTop";
import ToastContainer from "@/components/ToastContainer";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, LOGO_URL, absoluteUrl, jsonLd } from "@/lib/seo";
import { localeHref, searchHref } from "@/lib/urls";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "Aura Compare · Parfüm Karşılaştırma ve Koku Rehberi",
        template: `%s | ${SITE_NAME}`,
    },
    description:
        "Aura Compare: Türkiye'nin kapsamlı parfüm karşılaştırma ve koku rehberi. Binlerce parfümün koku piramidini, kalıcılık ve yayılım puanlarını, kullanıcı yorumlarını tek sayfada inceleyin.",
    keywords: [
        "parfüm",
        "parfüm karşılaştırma",
        "koku notaları",
        "parfüm inceleme",
        "erkek parfüm",
        "kadın parfüm",
        "en iyi parfümler",
        "kalıcı parfümler",
    ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    // Canonical burada tanımlanmaz: kök ayar tüm alt sayfalara miras kalır ve hepsini
    // anasayfaya işaret ettirir. Her sayfa kendi canonical'ını pageMetadata() ile verir.
    openGraph: {
        type: "website",
        locale: "tr_TR",
        siteName: SITE_NAME,
        images: [DEFAULT_OG_IMAGE],
    },
    // Twitter başlığı/açıklaması burada verilmez; verilirse her sayfada anasayfanınki kalır.
    twitter: {
        card: "summary_large_image",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const jsonLdWebSite = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        alternateName: "AuraCompare",
        url: absoluteUrl(localeHref("/")),
        inLanguage: "tr-TR",
        description:
            "Türkiye'nin parfüm karşılaştırma, koku notaları ve kullanıcı değerlendirme portalı.",
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${absoluteUrl(searchHref())}?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };

    const jsonLdOrg = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: absoluteUrl(localeHref("/")),
        logo: LOGO_URL,
    };

    return (
        <html lang="tr">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdWebSite) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdOrg) }}
                />
            </head>
            <body>
                <ScrollToTop />
                <Header />
                <main className="main-content">
                    <div className="shell">{children}</div>
                </main>
                <Footer />
                <CompareBar />
                <ToastContainer />
            </body>
        </html>
    );
}
