import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import Breadcrumb from "@/components/Breadcrumb";
import BrandPerfumesClient, { type BrandDetail } from "@/components/BrandPerfumesClient";
import type { PerfumeCardData } from "@/components/PerfumeCard";
import { API_BASE, mediaUrl, brandHref, localeHref, perfumeHref } from "@/lib/urls";
import { absoluteUrl, jsonLd, pageMetadata } from "@/lib/seo";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!slug) notFound();

    const res = await fetch(`${API_BASE}/api/brands/${slug}`, { next: { revalidate: 60 } });
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    const brand: BrandDetail = await res.json();

    const descParts: string[] = [];
    if (brand.country) descParts.push(`${brand.country} menşeili`);
    if (brand.perfumeCount) descParts.push(`${brand.perfumeCount} parfüm`);
    if (brand.firstYear && brand.lastYear) descParts.push(`${brand.firstYear} - ${brand.lastYear}`);
    const summary = descParts.length > 0 ? ` (${descParts.join(", ")})` : "";

    return pageMetadata({
        title: `${brand.name} Parfümleri ve Fiyat Karşılaştırması`,
        description: `${brand.name} parfümleri${summary}. En popüler kokuları, koku piramidi ve kullanıcı yorumları.`,
        path: brandHref(brand.slug),
        images: [mediaUrl(brand.logoUrl)],
    });
}

export default async function BrandPage({ params }: PageProps) {
    const { slug } = await params;

    const brandRes = await fetch(`${API_BASE}/api/brands/${slug}`, { next: { revalidate: 60 } });
    // Marka yoksa 404; API hatasında 500 (geçici kesinti "sayfa silindi" sayılmasın).
    if (brandRes.status === 404) notFound();
    if (!brandRes.ok) throw new Error(`Marka alınamadı: ${brandRes.status}`);
    const brand: BrandDetail = await brandRes.json();

    let initialPerfumes: PerfumeCardData[] = [];
    let initialTotal = 0;

    try {
        const perfumesRes = await fetch(`${API_BASE}/api/perfumes?brand=${slug}&page=1&pageSize=24`, {
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
    const jsonLdList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${brand.name} parfümleri`,
        numberOfItems: initialTotal,
        itemListElement: initialPerfumes.map((p, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
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
