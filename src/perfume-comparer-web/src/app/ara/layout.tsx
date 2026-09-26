import type { Metadata } from "next";
import { searchHref } from "@/lib/urls";
import { pageMetadata } from "@/lib/seo";

// Arama sayfası tarayıcıda çalışan bir bileşen olduğu için metadata'yı burada verir.
// Filtreli adresler (?note=..., ?brand=...) aynı sayfanın varyasyonudur; asıl adres
// filtresiz /tr/detayli-arama'dır.
export const metadata: Metadata = pageMetadata({
    title: "Detaylı Parfüm Arama - Nota, Marka ve Koku Ailesine Göre Filtrele",
    description:
        "Binlerce parfümü notalarına, akorlarına, markasına, koku ailesine, mevsimine ve cinsiyetine göre filtreleyin ve sıralayın.",
    path: searchHref(),
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
    return children;
}
