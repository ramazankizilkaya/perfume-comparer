import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: `${SITE_NAME} · Parfüm Karşılaştırma ve Koku Rehberi`,
        short_name: SITE_NAME,
        description: "Türkiye'nin kapsamlı parfüm karşılaştırma ve koku rehberi portalı.",
        start_url: "/tr",
        display: "standalone",
        background_color: "#F4F6F5",
        theme_color: "#0C6658",
        icons: [
            {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
