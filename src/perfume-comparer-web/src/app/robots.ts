import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                // Yönetim, giriş ve kullanıcıya özel sayfaların asıl adresi /tr/... biçimidir;
                // ön eksiz halleri de (308 ile yönlenseler bile) engellenir. Bu sayfalar ayrıca
                // noindex taşır; robots engeli botların bu sayfalara hiç girmemesini sağlar.
                disallow: [
                    "/admin",
                    "/tr/admin",
                    "/giris",
                    "/tr/giris",
                    "/blog/onizleme",
                    "/tr/blog/onizleme",
                    "/blog/yazilarim",
                    "/tr/blog/yazilarim",
                    "/api/",
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
