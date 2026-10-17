import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import SearchClient from "@/components/SearchClient";
import type { PerfumeCardData } from "@/components/PerfumeCard";
import { pageMetadata } from "@/lib/seo";
import { searchHref } from "@/lib/urls";
import { apiFetch } from "@/lib/api";
import {
    buildApiQuery,
    describeSearch,
    isServerFetchable,
    parseSearchQuery,
    toUrlParams,
    type SearchMeta,
} from "@/lib/searchParams";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * /tr/detayli-arama (App Router klasörü: /ara; proxy.ts rewrite eder).
 *
 * Sayfa sunucuda hazırlanır: H1, giriş cümlesi ve ilk 48 sonuç HTML'de gelir; böylece
 * nota/akor/cinsiyet/marka linklerinin hepsinin indiği bu adres Google'a boş görünmez.
 * Etkileşimli filtreleme SearchClient'ta devam eder; aynı sorguyu tekrar çekmez.
 *
 * İndeksleme kuralı (describeSearch): filtresiz sayfa ve tek filtreli adresler
 * (accord, note, gender, family) index + kendi canonical'ı; tek marka filtresi canonical
 * olarak /tr/marka/<slug>'ı gösterir; metin araması, sıralama, kullanıcı listeleri ve
 * çoklu kombinasyonlar noindex,follow + canonical filtresiz sayfa.
 */

async function loadMeta(): Promise<SearchMeta | null> {
    try {
        const res = await apiFetch("/api/meta/filters", { next: { revalidate: 300 } });
        return res.ok ? ((await res.json()) as SearchMeta) : null;
    } catch {
        return null;
    }
}

async function loadFirstPage(query: ReturnType<typeof parseSearchQuery>): Promise<{ items: PerfumeCardData[]; total: number } | null> {
    if (!isServerFetchable(query)) return null;
    try {
        const res = await apiFetch(`/api/perfumes?${buildApiQuery(query, 1).toString()}`, { next: { revalidate: 60 } });
        if (!res.ok) return null;
        const data = await res.json();
        return { items: data.items ?? [], total: data.totalCount ?? data.items?.length ?? 0 };
    } catch {
        return null;
    }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const query = parseSearchQuery(await searchParams);
    const meta = await loadMeta();
    const d = describeSearch(query, meta);
    return pageMetadata({
        title: d.title,
        description: d.description,
        path: d.canonicalPath,
        noIndex: !d.indexable,
    });
}

export default async function SearchPage({ searchParams }: PageProps) {
    const query = parseSearchQuery(await searchParams);
    const [meta, first] = await Promise.all([loadMeta(), loadFirstPage(query)]);
    const d = describeSearch(query, meta, first?.total ?? null);

    return (
        <>
            <PageBreadcrumb
                trail={[
                    { label: "Detaylı arama", href: searchHref() },
                    ...(d.crumb ? [{ label: d.crumb }] : []),
                ]}
            />

            <header className="search-page-head">
                <h1 className="page-title">{d.h1}</h1>
                <p className="search-page-lead">{d.intro}</p>
            </header>

            {/* key: adres parametreleri değişince istemci sıfırdan kurulur ve yeni ilk sayfayla açılır. */}
            <SearchClient
                key={toUrlParams(query).toString()}
                initialQuery={query}
                initialMeta={meta}
                initialResults={first?.items ?? []}
                initialTotal={first?.total ?? 0}
                serverFetched={first !== null}
            />
        </>
    );
}
