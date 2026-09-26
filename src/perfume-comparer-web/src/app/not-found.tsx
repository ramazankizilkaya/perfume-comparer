import type { Metadata } from "next";
import Link from "next/link";
import { brandHref, localeHref, searchHref } from "@/lib/urls";

// robots etiketi burada verilmez: Next.js 404 yanıtına kendisi "noindex" ekler.
export const metadata: Metadata = {
    title: "Sayfa bulunamadı",
};

/** Olmayan her adres ve notFound() çağrısı bu sayfayı 404 koduyla gösterir. */
export default function NotFound() {
    return (
        <div className="state">
            <h1 className="page-title">Sayfa bulunamadı</h1>
            <p>Aradığınız sayfa kaldırılmış ya da adresi değişmiş olabilir.</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
                <Link href={localeHref("/")} className="btn btn-primary">
                    Anasayfaya dön
                </Link>
                <Link href={searchHref()} className="btn btn-ghost">
                    Parfüm ara
                </Link>
                <Link href={brandHref()} className="btn btn-ghost">
                    Tüm markalar
                </Link>
            </div>
        </div>
    );
}
