import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import CompareClient, { type PerfumeDetail } from "@/components/CompareClient";
import { API_BASE } from "@/lib/urls";
import { MAX_COMPARE } from "@/lib/stores";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function parseSlugs(sp: { [key: string]: string | string[] | undefined }): string[] {
    const itemsRaw = typeof sp.items === "string" ? sp.items : undefined;
    if (itemsRaw) {
        return itemsRaw.split(",").filter(Boolean).slice(0, MAX_COMPARE);
    }
    const p1 = typeof sp.p1 === "string" ? sp.p1 : undefined;
    const p2 = typeof sp.p2 === "string" ? sp.p2 : undefined;
    return [p1, p2].filter(Boolean) as string[];
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const sp = await searchParams;
    const slugs = parseSlugs(sp);

    if (slugs.length >= 2) {
        try {
            const list = await Promise.all(
                slugs.slice(0, 3).map((s) =>
                    fetch(`${API_BASE}/api/perfumes/${s}`, { next: { revalidate: 60 } }).then((r) =>
                        r.ok ? r.json() : null,
                    ),
                ),
            );
            const valid = list.filter(Boolean) as PerfumeDetail[];
            if (valid.length >= 2) {
                const names = valid.map((p) => p.name).join(" vs ");
                return {
                    title: `${names} Karşılaştırması | Aura Compare`,
                    description: `${names} parfümlerinin nota piramidi, kalıcılık, yayılım, kullanıcı puanları ve mevsim uyumu karşılaştırması.`,
                };
            }
        } catch {
            /* varsayılana dön */
        }
    }

    return {
        title: "Koku Karşılaştırma - Parfümleri Yan Yana Kıyaslayın | Aura Compare",
        description: "En popüler parfümleri koku piramidi, kalıcılık, yayılım ve kullanıcı oylarıyla tek tabloda yan yana karşılaştırın.",
    };
}

export default async function ComparePage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const slugs = parseSlugs(sp);

    let initialPerfumes: PerfumeDetail[] = [];
    if (slugs.length > 0) {
        try {
            const list = await Promise.all(
                slugs.map((s) =>
                    fetch(`${API_BASE}/api/perfumes/${s}`, { next: { revalidate: 60 } }).then((r) =>
                        r.ok ? r.json() : null,
                    ),
                ),
            );
            initialPerfumes = list.filter(Boolean) as PerfumeDetail[];
        } catch {
            initialPerfumes = [];
        }
    }

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Karşılaştırma" }]} />

            <header style={{ marginBottom: "1.25rem" }}>
                <span className="eyebrow">Yan yana</span>
                <h1 className="page-title">Koku karşılaştırma</h1>
                <p className="section-desc">
                    En fazla {MAX_COMPARE} parfümü notaları, puanı, mevsim ve yaş uyumuyla tek tabloda inceleyin.
                </p>
            </header>

            <Suspense fallback={<div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>}>
                <CompareClient initialPerfumes={initialPerfumes} initialSlugs={slugs} />
            </Suspense>
        </>
    );
}
