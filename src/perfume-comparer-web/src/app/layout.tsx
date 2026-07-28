import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";

export const metadata: Metadata = {
    title: "Aura Compare · Parfüm Karşılaştırma ve Koku Rehberi",
    description:
        "Parfümleri notalarına, koku ailesine, mevsim ve yaş uyumuna göre karşılaştırın. Koku piramidini, kullanıcı puanlarını ve yorum özetlerini tek sayfada görün.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr">
            <body>
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
