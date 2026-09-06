import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import BrandsFilterClient, { type BrandCard } from "@/components/BrandsFilterClient";
import { API_BASE } from "@/lib/urls";

export const metadata: Metadata = {
    title: "Tüm Parfüm Markaları A'dan Z'ye | Aura Compare",
    description: "Dünyaca ünlü parfüm markaları, tasarımcı ve niş üreticiler ile tüm parfümleri A'dan Z'ye fihrist halinde inceleyin.",
};

export default async function BrandsPage() {
    let brands: BrandCard[] = [];
    try {
        const res = await fetch(`${API_BASE}/api/brands`, { next: { revalidate: 60 } });
        if (res.ok) brands = await res.json();
    } catch {
        brands = [];
    }

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Markalar" }]} />

            <header style={{ marginBottom: "1rem" }}>
                <span className="eyebrow">Marka rehberi</span>
                <h1 className="page-title">Tüm markalar</h1>
            </header>

            <BrandsFilterClient initialBrands={brands} />
        </>
    );
}
