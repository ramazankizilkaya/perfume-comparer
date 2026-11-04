import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { localeHref } from "@/lib/urls";

// Yönetim sayfası: arama sonuçlarında görünmemeli (noindex,follow); robots.txt de engeller.
export const metadata: Metadata = pageMetadata({
    title: "Yönetim paneli",
    description: "Yönetim paneli: site analitiği, makale onayı, yorum moderasyonu ve bakım işlemleri.",
    path: localeHref("/admin"),
    noIndex: true,
});

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
    return children;
}
