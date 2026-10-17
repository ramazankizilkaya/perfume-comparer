import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import CompareClient, { type PerfumeDetail } from "@/components/CompareClient";
import { localeHref } from "@/lib/urls";
import { pageMetadata } from "@/lib/seo";
import { apiFetch } from "@/lib/api";
import { fullPerfumeName } from "@/lib/perfumeName";
import { MAX_COMPARE } from "@/lib/constants";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * ?items=a,b (veya eski ?parfumler= / ?p1=&p2=) içindeki slug'ları okur.
 * Aynı slug iki kez geçerse teke indirilir, en fazla MAX_COMPARE parfüm alınır.
 */
function parseSlugs(sp: { [key: string]: string | string[] | undefined }): string[] {
    const itemsRaw = typeof sp.items === "string" ? sp.items : typeof sp.parfumler === "string" ? sp.parfumler : undefined;
    const raw = itemsRaw
        ? itemsRaw.split(",")
        : [typeof sp.p1 === "string" ? sp.p1 : "", typeof sp.p2 === "string" ? sp.p2 : ""];
    return [...new Set(raw.map((s) => s.trim()).filter(Boolean))].slice(0, MAX_COMPARE);
}

/** Aynı istek içinde generateMetadata ve sayfa aynı adresleri çektiği için Next fetch'i tekilleştirir. */
async function loadPerfumes(slugs: string[]): Promise<PerfumeDetail[]> {
    if (slugs.length === 0) return [];
    try {
        const list = await Promise.all(
            slugs.map((s) =>
                apiFetch(`/api/perfumes/${encodeURIComponent(s)}`, { next: { revalidate: 60 } }).then((r) =>
                    r.ok ? (r.json() as Promise<PerfumeDetail>) : null,
                ),
            ),
        );
        return list.filter((p): p is PerfumeDetail => Boolean(p));
    } catch {
        return [];
    }
}

function compareTitle(perfumes: PerfumeDetail[]): string {
    return `${perfumes.map(fullPerfumeName).join(" vs ")} karşılaştırması`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const sp = await searchParams;
    const slugs = parseSlugs(sp);
    const valid = slugs.length >= 2 ? await loadPerfumes(slugs) : [];

    if (valid.length >= 2) {
        const names = valid.map(fullPerfumeName);
        // ?items=a,b / ?items=b,a / ?p1=a&p2=b aynı içeriktir; asıl adres slug'ları
        // alfabetik sıralanmış ?items= biçimidir. Böylece A,B ve B,A tek canonical paylaşır.
        const canonicalItems = valid.map((p) => p.slug).sort().join(",");
        return pageMetadata({
            title: compareTitle(valid),
            description: `${names.join(" ve ")} parfümlerinin nota piramidi, kalıcılık, yayılım, kullanıcı puanları ve mevsim uyumu karşılaştırması.`,
            path: localeHref(`/karsilastir?items=${canonicalItems}`),
        });
    }

    return pageMetadata({
        title: "Koku Karşılaştırma - Parfümleri Yan Yana Kıyaslayın",
        description: "En popüler parfümleri koku piramidi, kalıcılık, yayılım ve kullanıcı oylarıyla tek tabloda yan yana karşılaştırın.",
        path: localeHref("/karsilastir"),
        // Parametreli ama geçerli bir çift içermeyen adresler (tek parfüm, bilinmeyen slug,
        // aynı slug iki kez) indekslenmez; boş sayfa aynı içeriğin kopyası olmasın.
        noIndex: slugs.length > 0,
    });
}

export default async function ComparePage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const slugs = parseSlugs(sp);
    const initialPerfumes = await loadPerfumes(slugs);
    const hasPair = initialPerfumes.length >= 2;

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Karşılaştırma" }]} />

            <header style={{ marginBottom: "1.25rem" }}>
                <h1 className="page-title">{hasPair ? compareTitle(initialPerfumes) : "Koku karşılaştırma"}</h1>
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
