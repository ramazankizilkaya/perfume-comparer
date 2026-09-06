import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import Breadcrumb from "@/components/Breadcrumb";
import BrandPerfumesClient, { type BrandDetail } from "@/components/BrandPerfumesClient";
import type { PerfumeCardData } from "@/components/PerfumeCard";
import { API_BASE, mediaUrl } from "@/lib/urls";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!slug) return { title: "Marka | Aura Compare" };

    try {
        const res = await fetch(`${API_BASE}/api/brands/${slug}`, { next: { revalidate: 60 } });
        if (!res.ok) return { title: "Marka Bulunamadı | Aura Compare" };
        const brand: BrandDetail = await res.json();

        const title = `${brand.name} Parfümleri ve Fiyat Karşılaştırması | Aura Compare`;
        const descParts: string[] = [];
        if (brand.country) descParts.push(`${brand.country} menşeili`);
        if (brand.perfumeCount) descParts.push(`${brand.perfumeCount} parfüm`);
        if (brand.firstYear && brand.lastYear) descParts.push(`${brand.firstYear} - ${brand.lastYear}`);
        const description = `${brand.name} parfümleri (${descParts.join(", ")}). En popüler kokuları, koku piramidi ve kullanıcı yorumları.`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: brand.logoUrl ? [{ url: mediaUrl(brand.logoUrl)! }] : [],
            },
        };
    } catch {
        return { title: "Marka | Aura Compare" };
    }
}

export default async function BrandPage({ params }: PageProps) {
    const { slug } = await params;

    let brand: BrandDetail | null = null;
    let initialPerfumes: PerfumeCardData[] = [];
    let initialTotal = 0;

    try {
        const [brandRes, perfumesRes] = await Promise.all([
            fetch(`${API_BASE}/api/brands/${slug}`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes?brand=${slug}&page=1&pageSize=24`, { next: { revalidate: 60 } }),
        ]);

        if (brandRes.ok) brand = await brandRes.json();
        if (perfumesRes.ok) {
            const data = await perfumesRes.json();
            initialPerfumes = data.items ?? [];
            initialTotal = data.totalCount ?? 0;
        }
    } catch {
        brand = null;
    }

    if (!brand) {
        return (
            <div className="state">
                <h2>Marka bulunamadı</h2>
                <p>Aradığınız marka sistemde yok.</p>
                <Link href="/marka" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
                    Tüm markalar
                </Link>
            </div>
        );
    }

    return (
        <>
            <Breadcrumb
                items={[
                    { level: "home", label: "Anasayfa", slug: "" },
                    { level: "page", label: "Markalar", slug: "", href: "/marka" },
                    { level: "page", label: brand.name, slug: "" },
                ]}
            />

            <header className="brand-head">
                <div className="brand-logo">
                    {brand.logoUrl ? (
                        <img src={mediaUrl(brand.logoUrl)} alt={`${brand.name} logosu`} />
                    ) : (
                        <span className="brand-logo-fallback">{brand.name}</span>
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

                <div className="brand-head-main">
                    <h1 className="brand-name">{brand.name}</h1>
                    {brand.description && <p className="brand-desc">{brand.description}</p>}
                    {brand.websiteUrl && (
                        <a className="link-more" href={brand.websiteUrl} target="_blank" rel="noreferrer noopener">
                            Resmi site <Icon name="arrow-right" size={13} />
                        </a>
                    )}
                </div>
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
