import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Icon from "@/components/Icon";
import Breadcrumb from "@/components/Breadcrumb";
import BrandPerfumesClient, { type BrandDetail } from "@/components/BrandPerfumesClient";
import BrandPagination from "@/components/BrandPagination";
import type { PerfumeCardData } from "@/components/PerfumeCard";
import { API_BASE, mediaUrl, brandHref, localeHref, perfumeHref } from "@/lib/urls";
import { absoluteUrl, jsonLd, pageMetadata } from "@/lib/seo";

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!slug) notFound();

    const sp = await searchParams;
    const rawSayfa = typeof sp.sayfa === "string" ? sp.sayfa : undefined;

    let pageNum = 1;
    if (rawSayfa !== undefined) {
        if (!/^\d+$/.test(rawSayfa)) notFound();
        pageNum = parseInt(rawSayfa, 10);
        if (pageNum <= 0) notFound();
    }

    const res = await fetch(`${API_BASE}/api/brands/${slug}`, { next: { revalidate: 60 } });
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    const brand: BrandDetail = await res.json();

    const totalPages = Math.max(1, Math.ceil(brand.perfumeCount / 24));
    if (pageNum > totalPages) {
        notFound();
    }

    const descParts: string[] = [];
    if (brand.country) descParts.push(`${brand.country} menşeili`);
    if (brand.perfumeCount) descParts.push(`${brand.perfumeCount} parfüm`);
    if (brand.firstYear && brand.lastYear) descParts.push(`${brand.firstYear} - ${brand.lastYear}`);
    const summary = descParts.length > 0 ? ` (${descParts.join(", ")})` : "";

    const canonicalPath = pageNum > 1 ? `${brandHref(brand.slug)}?sayfa=${pageNum}` : brandHref(brand.slug);
    const title =
        pageNum > 1
            ? `${brand.name} Parfümleri - Sayfa ${pageNum}`
            : `${brand.name} Parfümleri ve Fiyat Karşılaştırması`;

    return pageMetadata({
        title,
        description: `${brand.name} parfümleri${summary}. En popüler kokuları, koku piramidi ve kullanıcı yorumları.${
            pageNum > 1 ? ` (Sayfa ${pageNum})` : ""
        }`,
        path: canonicalPath,
        images: [mediaUrl(brand.logoUrl)],
    });
}

export default async function BrandPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const sp = await searchParams;
    const rawSayfa = typeof sp.sayfa === "string" ? sp.sayfa : undefined;

    let pageNum = 1;
    if (rawSayfa !== undefined) {
        if (!/^\d+$/.test(rawSayfa)) notFound();
        pageNum = parseInt(rawSayfa, 10);
        if (pageNum <= 0) notFound();

        // Her sayfanın tek bir adresi olur: ?sayfa=1 parametresiz adrese, ?sayfa=02 gibi
        // standart dışı yazımlar ?sayfa=2 adresine 308 ile yönlenir.
        if (pageNum === 1 || rawSayfa !== String(pageNum)) {
            permanentRedirect(pageNum === 1 ? brandHref(slug) : `${brandHref(slug)}?sayfa=${pageNum}`);
        }
    }

    const brandRes = await fetch(`${API_BASE}/api/brands/${slug}`, { next: { revalidate: 60 } });
    // Marka yoksa 404; API hatasında 500 (geçici kesinti "sayfa silindi" sayılmasın).
    if (brandRes.status === 404) notFound();
    if (!brandRes.ok) throw new Error(`Marka alınamadı: ${brandRes.status}`);
    const brand: BrandDetail = await brandRes.json();

    let initialPerfumes: PerfumeCardData[] = [];
    let initialTotal = 0;

    try {
        const perfumesRes = await fetch(`${API_BASE}/api/perfumes?brand=${slug}&page=${pageNum}&pageSize=24`, {
            next: { revalidate: 60 },
        });
        if (perfumesRes.ok) {
            const data = await perfumesRes.json();
            initialPerfumes = data.items ?? [];
            initialTotal = data.totalCount ?? 0;
        }
    } catch {
        /* liste boş gösterilir */
    }

    const totalPages = Math.max(1, Math.ceil(initialTotal / 24));
    // Aralık dışı sayfa 404 döner
    if (initialTotal > 0 && pageNum > totalPages) {
        notFound();
    }

    const brandUrl = absoluteUrl(brandHref(brand.slug));
    const jsonLdBrand = {
        "@context": "https://schema.org",
        "@type": "Brand",
        name: brand.name,
        url: brandUrl,
        ...(brand.logoUrl ? { logo: mediaUrl(brand.logoUrl) } : {}),
        ...(brand.description ? { description: brand.description } : {}),
        ...(brand.websiteUrl ? { sameAs: [brand.websiteUrl] } : {}),
    };

    const offset = (pageNum - 1) * 24;
    const jsonLdList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${brand.name} parfümleri${pageNum > 1 ? ` (Sayfa ${pageNum})` : ""}`,
        numberOfItems: initialTotal,
        itemListElement: initialPerfumes.map((p, idx) => ({
            "@type": "ListItem",
            position: offset + idx + 1,
            name: p.name.toLowerCase().includes(brand.name.toLowerCase()) ? p.name : `${brand.name} ${p.name}`,
            url: absoluteUrl(perfumeHref(p.path, p.slug)),
        })),
    };

    const jsonLdBreadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Anasayfa", item: absoluteUrl(localeHref("/")) },
            { "@type": "ListItem", position: 2, name: "Markalar", item: absoluteUrl(brandHref()) },
            { "@type": "ListItem", position: 3, name: brand.name, item: brandUrl },
        ],
    };

    const paginationNode = (
        <BrandPagination
            brandSlug={brand.slug}
            currentPage={pageNum}
            totalPages={totalPages}
        />
    );

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdBrand) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdBreadcrumb) }} />
            {initialPerfumes.length > 0 && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdList) }} />
            )}
            <Breadcrumb
                items={[
                    { level: "home", label: "Anasayfa", slug: "" },
                    { level: "page", label: "Markalar", slug: "", href: brandHref() },
                    { level: "page", label: brand.name, slug: "" },
                ]}
            />

            <header className="brand-head">
                <div className="brand-logo">
                    {brand.logoUrl ? (
                        <img src={mediaUrl(brand.logoUrl)} alt={`${brand.name} parfüm markası logosu`} />
                    ) : (
                        <span className="brand-logo-fallback">{brand.name}</span>
                    )}
                </div>

                <div className="brand-head-main">
                    <h1 className="brand-name">{brand.name}</h1>
                    {brand.description && <p className="brand-desc">{brand.description}</p>}
                    {brand.websiteUrl && (
                        <a className="link-more" href={brand.websiteUrl} target="_blank" rel="noreferrer noopener">
                            Resmi site <Icon name="arrow-right" size={13} />
                        </a>
                    )}
                </div>

                <table className="spec brand-spec">
                    <tbody>
                        <BrandSpec label="Ülke" value={brand.country} />
                        <BrandSpec label="Faaliyet" value={brand.mainActivity} />
                        <BrandSpec label="Ana şirket" value={brand.parentCompany} />
                        <BrandSpec label="Parfüm sayısı" value={brand.perfumeCount.toString()} />
                        <BrandSpec
                            label="Üretim aralığı"
                            value={brand.firstYear && brand.lastYear ? `${brand.firstYear} – ${brand.lastYear}` : null}
                        />
                        <BrandSpec
                            label="Ortalama puan"
                            value={brand.avgRating > 0 ? `${brand.avgRating.toFixed(2)} / 5` : null}
                        />
                    </tbody>
                </table>
            </header>

            <BrandPerfumesClient
                slug={slug}
                brand={brand}
                initialPerfumes={initialPerfumes}
                initialTotal={initialTotal}
                currentPage={pageNum}
                pagination={paginationNode}
            />
        </>
    );
}

function BrandSpec({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <tr>
            <th>{label}</th>
            <td>{value}</td>
        </tr>
    );
}
