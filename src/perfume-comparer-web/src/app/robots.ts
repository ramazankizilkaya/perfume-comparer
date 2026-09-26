import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                // Yönetim sayfasının asıl adresi /tr/admin'dir; ön eksiz hali de engellenir.
                // Giriş ve "Yazılarım" gibi sayfalar burada engellenmez: noindex etiketlerini
                // görebilmeleri için botların o sayfaları okuyabilmesi gerekir.
                disallow: ["/admin", "/tr/admin", "/api/"],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
