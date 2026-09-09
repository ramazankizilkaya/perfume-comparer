import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import ScrollToTop from "@/components/ScrollToTop";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://auracompare.com";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "Aura Compare · Parfüm Karşılaştırma ve Koku Rehberi",
        template: "%s | Aura Compare",
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
    authors: [{ name: "Aura Compare" }],
    creator: "Aura Compare",
    publisher: "Aura Compare",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "tr_TR",
        url: siteUrl,
        siteName: "Aura Compare",
        title: "Aura Compare · Parfüm Karşılaştırma ve Koku Rehberi",
        description:
            "Binlerce parfümün koku piramidini, kalıcılık ve yayılım puanlarını, kullanıcı yorumlarını tek sayfada inceleyin.",
    },
    twitter: {
        card: "summary_large_image",
        title: "Aura Compare · Parfüm Karşılaştırma ve Koku Rehberi",
        description:
            "Parfümleri notalarına, mevsimine ve kalıcılığına göre karşılaştırın.",
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
        name: "Aura Compare",
        alternateName: "AuraCompare",
        url: siteUrl,
        description:
            "Türkiye'nin parfüm karşılaştırma, koku notaları ve kullanıcı değerlendirme portalı.",
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${siteUrl}/ara?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };

    const jsonLdOrg = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Aura Compare",
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
    };

    const jsonLdSiteLinks = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: [
            {
                "@type": "SiteNavigationElement",
                position: 1,
                name: "Parfüm Ara",
                description: "Binlerce parfümü notalarına, markasına ve koku ailesine göre filtreleyin.",
                url: `${siteUrl}/ara`,
            },
            {
                "@type": "SiteNavigationElement",
                position: 2,
                name: "Parfüm Karşılaştır",
                description: "İki veya daha fazla parfümün notalarını, kalıcılık ve yayılım puanlarını yan yana kıyaslayın.",
                url: `${siteUrl}/karsilastir`,
            },
            {
                "@type": "SiteNavigationElement",
                position: 3,
                name: "Markalar",
                description: "Dior, Chanel, Tom Ford gibi yüzlerce parfüm markasının tüm koleksiyonlarını keşfedin.",
                url: `${siteUrl}/marka`,
            },
            {
                "@type": "SiteNavigationElement",
                position: 4,
                name: "Popüler Parfümler",
                description: "En çok oy alan ve kullanıcıların en çok beğendiği popüler parfümler listesi.",
                url: `${siteUrl}/ara?sort=views`,
            },
            {
                "@type": "SiteNavigationElement",
                position: 5,
                name: "Parfüm Rehberi & Blog",
                description: "Koku piramidi rehberi, mevsimsel parfüm önerileri ve editör yazıları.",
                url: `${siteUrl}/blog`,
            },
        ],
    };

    return (
        <html lang="tr">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSiteLinks) }}
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
            </body>
        </html>
    );
}
