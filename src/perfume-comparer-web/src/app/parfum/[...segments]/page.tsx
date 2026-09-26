import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Score from "@/components/Score";
import Stars from "@/components/Stars";
import Breadcrumb from "@/components/Breadcrumb";
import PerfumeHeroMedia from "@/components/PerfumeHeroMedia";
import PerfumeReviewButton from "@/components/PerfumeReviewButton";
import PerfumeUserPhotos from "@/components/PerfumeUserPhotos";
import PerfumeCommentsSection, { type CommentData } from "@/components/PerfumeCommentsSection";
import PerfumeArticleSection from "@/components/PerfumeArticleSection";
import PerfumeFaqSection, { type FaqItem } from "@/components/PerfumeFaqSection";
import PerfumeWhereToBuySection from "@/components/PerfumeWhereToBuySection";
import { API_BASE, genderLabel, brandHref, perfumeHref, mediaUrl, localeHref, searchHref } from "@/lib/urls";
import { absoluteUrl, jsonLd, pageMetadata } from "@/lib/seo";
import { noteIcon } from "@/lib/notes";
import type { PerfumeRef } from "@/lib/stores";
import type { AgeGroupScore } from "@/components/UsageVote";

interface Note {
    name: string;
    slug: string;
    category: string;
}

interface ScoredRef {
    name: string;
    slug: string;
    score: number;
    votes: number;
}

interface VoteBar {
    name: string;
    slug: string;
    votes: number;
    percent: number;
}

interface Accord {
    name: string;
    slug: string;
    width: number;
}

interface BreadcrumbItem {
    level: string;
    label: string;
    slug: string;
}

interface RelatedPerfume {
    perfumeName: string;
    perfumeSlug: string;
    brand: { name: string; slug: string };
    imageUrl?: string | null;
    path: string;
}

interface PerfumeDetail {
    name: string;
    slug: string;
    brand: { name: string; slug: string };
    gender: string;
    concentration?: string;
    concentrationSlug?: string;
    fragranceFamily?: string;
    fragranceFamilySlug?: string;
    fragranceFamilyDescription?: string;
    releaseYear?: number;
    description?: string;
    imageUrl?: string;
    avgRating: number;
    ratingCount: number;
    ratingBreakdown: VoteBar[];
    userAvgRating: number;
    userRatingCount: number;
    accords: Accord[];
    notes: { top: Note[]; middle: Note[]; base: Note[]; all: Note[] };
    seasons: ScoredRef[];
    timeOfDay: ScoredRef[];
    longevity: VoteBar[];
    sillage: VoteBar[];
    genderVotes: VoteBar[];
    priceVotes: VoteBar[];
    ageGroups: AgeGroupScore[];
    usageCount: number;
    viewCount?: number;
    breadcrumb: BreadcrumbItem[];
    alternatives: RelatedPerfume[];
    alsoLiked: RelatedPerfume[];
    path: string;
    article?: string;
    faq?: FaqItem[];
}

interface PageProps {
    params: Promise<{ segments: string[] }>;
}

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800";

const FACET_ICONS: Record<string, string> = {
    ilkbahar: "🌸",
    yaz: "☀️",
    sonbahar: "🍂",
    kis: "❄️",
    gunduz: "🌤️",
    gece: "🌙",
    genc: "🧑",
    "orta-yas": "🧔",
    olgun: "🧓",
    diger: "👥",
};

function genderSlug(gender?: string | null): string {
    if (gender === "Male") return "erkek";
    if (gender === "Female") return "kadin";
    return "unisex";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { segments } = await params;
    const slug = segments?.[segments.length - 1];
    if (!slug) notFound();

    const res = await fetch(`${API_BASE}/api/perfumes/${slug}`, { next: { revalidate: 60 } });
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    const perfume: PerfumeDetail = await res.json();
    const fullPerfumeName = fullNameOf(perfume);

    const descParts: string[] = [];
    if (perfume.gender) descParts.push(genderLabel(perfume.gender));
    if (perfume.fragranceFamily) descParts.push(`${perfume.fragranceFamily} koku ailesi`);
    if (perfume.accords?.length > 0) {
        descParts.push(`ana akorlar: ${perfume.accords.slice(0, 3).map((a) => a.name).join(", ")}`);
    }
    if (perfume.releaseYear) descParts.push(`${perfume.releaseYear} çıkışlı`);

    return pageMetadata({
        title: `${fullPerfumeName} Parfüm İncelemesi ve Notaları`,
        description: `${fullPerfumeName} ${descParts.join(" · ")}. Koku piramidi, kalıcılık ve kullanıcı yorumları.`,
        path: perfumeHref(perfume.path, perfume.slug),
        images: [mediaUrl(perfume.imageUrl)],
    });
}

/** Başlıklarda marka adı bir kez geçsin: "Dior Sauvage", "Dior Dior Homme" değil. */
function fullNameOf(perfume: Pick<PerfumeDetail, "name" | "brand">): string {
    const brandName = perfume.brand?.name ?? "";
    return perfume.name.toLowerCase().includes(brandName.toLowerCase())
        ? perfume.name
        : `${brandName} ${perfume.name}`;
}

export default async function PerfumeDetailPage({ params }: PageProps) {
    const { segments } = await params;
    const slug = segments?.[segments.length - 1];

    if (!slug) notFound();

    const pRes = await fetch(`${API_BASE}/api/perfumes/${slug}`, { next: { revalidate: 60 } });
    // Parfüm gerçekten yoksa 404 dönülür; API hatasında ise hata fırlatılır (500),
    // böylece geçici bir kesinti Google'a "sayfa silindi" diye bildirilmez.
    if (pRes.status === 404) notFound();
    if (!pRes.ok) throw new Error(`Parfüm alınamadı: ${pRes.status}`);
    const perfume: PerfumeDetail = await pRes.json();

    // Asıl adres tektir. /tr/parfum/herhangi/bir/sey/<slug> gibi farklı yollar kalıcı
    // olarak API'nin verdiği yola yönlendirilir; kopya adres oluşmaz.
    if (perfume.path && segments.map(safeDecode).join("/") !== perfume.path) {
        permanentRedirect(perfumeHref(perfume.path, perfume.slug));
    }

    let comments: CommentData[] = [];
    let userPhotos: { id: number; imageUrl: string; authorName: string; createdAt: string }[] = [];

    try {
        const [cRes, photosRes] = await Promise.all([
            fetch(`${API_BASE}/api/perfumes/${slug}/comments`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes/${slug}/photos`, { next: { revalidate: 60 } }),
        ]);

        if (cRes.ok) comments = await cRes.json();
        if (photosRes.ok) userPhotos = await photosRes.json();
    } catch {
        /* yorum ve fotoğraflar olmadan da sayfa gösterilir */
    }

    const bestSeason = pickTop(perfume.seasons);
    const bestTime = pickTop(perfume.timeOfDay);
    const bestAge = pickTop(perfume.ageGroups);
    const topLongevity = pickTopBar(perfume.longevity);
    const topSillage = pickTopBar(perfume.sillage);

    const hasPyramid =
        perfume.notes.top.length > 0 || perfume.notes.middle.length > 0 || perfume.notes.base.length > 0;
    const allNotes = hasPyramid
        ? [...perfume.notes.top, ...perfume.notes.middle, ...perfume.notes.base]
        : perfume.notes.all;

    const ref: PerfumeRef = {
        slug: perfume.slug,
        name: perfume.name,
        brandName: perfume.brand.name,
        imageUrl: perfume.imageUrl,
        path: perfume.path,
    };

    const perfumeUrl = absoluteUrl(perfumeHref(perfume.path, perfume.slug));
    const productImageUrl = mediaUrl(perfume.imageUrl);

    const brandName = perfume.brand?.name ?? "";
    const fullPerfumeName = fullNameOf(perfume);

    const jsonLdProduct = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: fullPerfumeName,
        image: productImageUrl ? [productImageUrl] : undefined,
        description:
            perfume.description ||
            `${fullPerfumeName} koku piramidi, notaları ve kullanıcı incelemeleri.`,
        brand: {
            "@type": "Brand",
            name: perfume.brand.name,
        },
        category: perfume.fragranceFamily || "Parfüm",
        url: perfumeUrl,
        // Google yalnızca sitenin kendi kullanıcılarından gelen puanı kabul eder.
        // Fragrantica topluluk puanı (avgRating) burada kullanılmaz.
        ...(perfume.userRatingCount > 0
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: Number(perfume.userAvgRating.toFixed(2)),
                      bestRating: 5,
                      worstRating: 1,
                      ratingCount: perfume.userRatingCount,
                  },
              }
            : {}),
    };

    const crumbParamMap: Record<string, string> = {
        gender: "gender",
        concentration: "concentration",
        brand: "brand",
    };

    const jsonLdBreadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: (perfume.breadcrumb || []).map((item, idx) => {
            let itemUrl = absoluteUrl(searchHref());
            if (item.level === "home") {
                itemUrl = absoluteUrl(localeHref("/"));
            } else if (idx === (perfume.breadcrumb?.length ?? 0) - 1) {
                itemUrl = perfumeUrl;
            } else {
                const sp = new URLSearchParams();
                for (let k = 0; k <= idx; k++) {
                    const prevItem = perfume.breadcrumb[k];
                    const paramKey = crumbParamMap[prevItem.level];
                    if (paramKey && prevItem.slug) {
                        sp.set(paramKey, prevItem.slug);
                    }
                }
                itemUrl = absoluteUrl(searchHref(Object.fromEntries(sp)));
            }

            return {
                "@type": "ListItem",
                position: idx + 1,
                name: item.label,
                item: itemUrl,
            };
        }),
    };

    const enrichedFaq = buildEnrichedFaq(
        perfume.faq,
        fullPerfumeName,
        perfume.name,
        brandName,
        perfume.fragranceFamily,
        perfume.fragranceFamilyDescription,
        perfume.notes,
        perfume.ratingBreakdown,
        perfume.longevity,
        perfume.sillage,
        perfume.genderVotes,
        perfume.priceVotes
    );

    const jsonLdFaq =
        enrichedFaq.length > 0
            ? {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: enrichedFaq.map((f) => ({
                      "@type": "Question",
                      name: f.question,
                      acceptedAnswer: {
                          "@type": "Answer",
                          text: f.answer,
                      },
                  })),
              }
            : null;

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdProduct) }}
            />
            {perfume.breadcrumb && perfume.breadcrumb.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdBreadcrumb) }}
                />
            )}
            {jsonLdFaq && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdFaq) }}
                />
            )}
            <Breadcrumb items={perfume.breadcrumb} />

            <div className="detail-head">
                <PerfumeHeroMedia perfume={ref} />

                <div className="detail-info">
                    <Link href={brandHref(perfume.brand.slug)} className="detail-brand">
                        {perfume.brand.name}
                    </Link>
                    <h1 className="detail-name">{perfume.name}</h1>

                    <div className="detail-rating">
                        <Score value={perfume.avgRating} count={perfume.ratingCount} lg caption="/ 100" />
                        <div className="detail-rating-meta">
                            <Stars value={perfume.avgRating} size={18} />
                            <span>
                                <strong>{perfume.avgRating.toFixed(2)}</strong> / 5 ·{" "}
                                {perfume.ratingCount.toLocaleString("tr-TR")} oy
                            </span>
                        </div>
                    </div>

                    <dl className="detail-facts">
                        <FactCell
                            label="Ürün cinsi"
                            value={genderLabel(perfume.gender)}
                            href={searchHref({ gender: genderSlug(perfume.gender) })}
                        />
                        <FactCell
                            label="Koku ailesi"
                            value={perfume.fragranceFamily}
                            href={perfume.fragranceFamilySlug ? searchHref({ family: perfume.fragranceFamilySlug }) : undefined}
                        />
                        <FactCell
                            label="Çıkış yılı"
                            value={perfume.releaseYear?.toString()}
                        />
                        <FactCell
                            label="Konsantrasyon"
                            value={perfume.concentration}
                            href={perfume.concentrationSlug ? searchHref({ concentration: perfume.concentrationSlug }) : undefined}
                        />
                    </dl>

                    <div className="detail-at-a-glance" aria-label="Hızlı kullanım özeti">
                        <span className="detail-glance-label">Hızlı özet</span>
                        {topLongevity && <GlanceCell label="Kalıcılık" value={topLongevity.name} />}
                        {topSillage && <GlanceCell label="Yayılım" value={topSillage.name} />}
                        {bestSeason && bestSeason.votes > 0 && <GlanceCell label="Mevsim" value={bestSeason.name} />}
                        {bestTime && bestTime.votes > 0 && <GlanceCell label="Zaman" value={bestTime.name} />}
                    </div>

                    {perfume.description && <p className="detail-desc">{perfume.description}</p>}

                    <PerfumeReviewButton slug={perfume.slug} perfumeName={fullPerfumeName} />
                </div>
            </div>

            <section className="block">
                <h2 className="block-title">{hasPyramid ? "Koku piramidi" : "Koku notaları"}</h2>
                {hasPyramid ? (
                    <div className="pyramid">
                        <Tier label="Üst notalar" layer="ust" notes={perfume.notes.top} />
                        <Tier label="Orta notalar" layer="orta" notes={perfume.notes.middle} />
                        <Tier label="Alt notalar" layer="alt" notes={perfume.notes.base} />
                    </div>
                ) : (
                    <div className="pyramid">
                        <Tier label="Notalar" notes={allNotes} />
                    </div>
                )}
            </section>

            <div className="detail-body">
                <PerfumeUserPhotos
                    slug={perfume.slug}
                    perfumeName={fullPerfumeName}
                    initialPhotos={userPhotos}
                />

                <section className="block">
                    <h2 className="block-title">Öne çıkan özellikler</h2>
                    <table className="spec">
                        <tbody>
                            <SpecRow label="Marka">
                                <SpecLink value={perfume.brand.name} href={searchHref({ brand: perfume.brand.slug })} />
                            </SpecRow>
                            <SpecRow label="Koku ailesi">
                                <SpecLink
                                    value={perfume.fragranceFamily}
                                    href={perfume.fragranceFamilySlug ? searchHref({ family: perfume.fragranceFamilySlug }) : undefined}
                                />
                            </SpecRow>
                            <SpecRow label="Cinsiyet">
                                <SpecLink value={genderLabel(perfume.gender)} href={searchHref({ gender: genderSlug(perfume.gender) })} />
                            </SpecRow>
                            <SpecRow label="Konsantrasyon">
                                <SpecLink
                                    value={perfume.concentration}
                                    href={perfume.concentrationSlug ? searchHref({ concentration: perfume.concentrationSlug }) : undefined}
                                />
                            </SpecRow>
                            <SpecRow label="Çıkış yılı">
                                <SpecLink value={perfume.releaseYear?.toString()} />
                            </SpecRow>
                            <SpecRow label="Puan">
                                <SpecLink
                                    value={`${perfume.avgRating.toFixed(2)} / 5 (${perfume.ratingCount.toLocaleString("tr-TR")} oy)`}
                                />
                            </SpecRow>
                            <SpecRow label="Ana akorlar">
                                <SpecLinkList items={perfume.accords.slice(0, 5)} hrefFor={(s) => searchHref({ accord: s })} />
                            </SpecRow>
                            {topLongevity && (
                                <SpecRow label="Kalıcılık">
                                    <SpecLink value={`${topLongevity.name} (%${topLongevity.percent})`} />
                                </SpecRow>
                            )}
                            {topSillage && (
                                <SpecRow label="Yayılım">
                                    <SpecLink value={`${topSillage.name} (%${topSillage.percent})`} />
                                </SpecRow>
                            )}
                            {bestSeason && bestSeason.votes > 0 && (
                                <SpecRow label="En uygun mevsim">
                                    <SpecLink value={`${bestSeason.name} (%${bestSeason.score})`} href={searchHref({ season: bestSeason.slug })} />
                                </SpecRow>
                            )}
                            {bestTime && bestTime.votes > 0 && (
                                <SpecRow label="Gün içi kullanım">
                                    <SpecLink value={bestTime.name} />
                                </SpecRow>
                            )}
                            {bestAge && bestAge.votes > 0 && (
                                <SpecRow label="En yaygın yaş grubu">
                                    <SpecLink value={`${bestAge.name} (%${bestAge.score})`} href={searchHref({ ageGroup: bestAge.slug })} />
                                </SpecRow>
                            )}
                        </tbody>
                    </table>
                </section>

                {perfume.accords.length > 0 && (
                    <section className="block">
                        <h2 className="block-title">Ana akorlar</h2>
                        <div className="accord-strips">
                            {perfume.accords.map((a) => (
                                <Link
                                    key={a.slug}
                                    href={searchHref({ accord: a.slug })}
                                    className="accord-strip"
                                    style={{ ["--fill" as string]: `${Math.round(a.width)}%` }}
                                    title={`${a.name} — %${Math.round(a.width)}`}
                                >
                                    <span className="accord-strip-name">{a.name}</span>
                                    <span className="accord-strip-val">%{Math.round(a.width)}</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                <section className="block">
                    <h2 className="block-title">Ne zaman, kime uygun?</h2>
                    <div className="facet-groups">
                        <FacetGroup title="Mevsim uyumu" items={perfume.seasons} hrefFor={(s) => searchHref({ season: s })} />
                        <FacetGroup title="Gündüz / gece" items={perfume.timeOfDay} />
                        <FacetGroup
                            title="Yaş grubu"
                            items={perfume.usageCount > 0 ? perfume.ageGroups : []}
                            empty='Henüz kimse bildirmedi. "Bu parfümü kullanıyorum" diyerek ilk siz olun.'
                            hrefFor={(s) => searchHref({ ageGroup: s })}
                        />
                    </div>
                </section>

                {perfume.alternatives.length > 0 && (
                    <RelatedBlock
                        title="Benzer kokular"
                        items={perfume.alternatives}
                        currentPerfumeName={fullPerfumeName}
                        kind="alternative"
                    />
                )}

                {perfume.alsoLiked.length > 0 && (
                    <RelatedBlock
                        title="Bu parfümü sevenler şunları da sevdi"
                        items={perfume.alsoLiked}
                        currentPerfumeName={fullPerfumeName}
                        kind="alsoLiked"
                    />
                )}

                <section className="block">
                    <h2 className="block-title">Kullanıcı oylamaları</h2>
                    <div className="vote-grid">
                        <VotePanel title="Genel puan dağılımı" items={perfume.ratingBreakdown} />
                        <VotePanel title="Kalıcılık" items={perfume.longevity} />
                        <VotePanel title="Yayılım" items={perfume.sillage} />
                        <VotePanel title="Kime gider?" items={perfume.genderVotes} />
                        <VotePanel title="Fiyat / değer" items={perfume.priceVotes} />
                        {perfume.userRatingCount > 0 && (
                            <div className="vote-panel">
                                <div className="panel-title">Site kullanıcı puanı</div>
                                <div className="panel-score-meta">
                                    <strong>{perfume.userAvgRating.toFixed(1)} / 5</strong>
                                    {perfume.userRatingCount} değerlendirme
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <PerfumeWhereToBuySection perfumeName={fullPerfumeName} brandName={perfume.brand.name} />

                <PerfumeArticleSection article={perfume.article} perfumeName={fullPerfumeName} />
                <PerfumeFaqSection items={enrichedFaq} perfumeName={fullPerfumeName} />

                <PerfumeCommentsSection
                    key={perfume.slug}
                    slug={perfume.slug}
                    initialComments={comments}
                />
            </div>
        </>
    );
}

function safeDecode(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

function pickTop<T extends { score: number }>(items?: T[]): T | null {
    if (!items?.length) return null;
    return [...items].sort((a, b) => b.score - a.score)[0];
}

function pickTopBar(items?: VoteBar[]): VoteBar | null {
    if (!items?.length) return null;
    const top = [...items].sort((a, b) => b.votes - a.votes)[0];
    return top.votes > 0 ? top : null;
}

function toScored(items: VoteBar[]): ScoredRef[] {
    return items.map((i) => ({ name: i.name, slug: i.slug, score: i.percent, votes: i.votes }));
}

function FactCell({ label, value, href }: { label: string; value?: string | null; href?: string }) {
    return (
        <div className="fact-cell">
            <dt>{label}</dt>
            <dd>{value ? href ? <Link href={href}>{value}</Link> : value : "—"}</dd>
        </div>
    );
}

function GlanceCell({ label, value }: { label: string; value: string }) {
    return (
        <span className="detail-glance-cell">
            <small>{label}</small>
            <strong>{value}</strong>
        </span>
    );
}

function SpecRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <tr>
            <th>{label}</th>
            <td>{children}</td>
        </tr>
    );
}

function SpecLink({ value, href }: { value?: string | null; href?: string }) {
    if (!value) return <span className="faint">—</span>;
    return href ? <Link href={href} className="spec-link">{value}</Link> : <>{value}</>;
}

function SpecLinkList({
    items,
    hrefFor,
}: {
    items: { name: string; slug: string }[];
    hrefFor: (slug: string) => string;
}) {
    if (!items.length) return <span className="faint">—</span>;
    return (
        <span className="spec-links">
            {items.map((i, idx) => (
                <Link key={`${i.slug}-${idx}`} href={hrefFor(i.slug)} className="spec-link">
                    {i.name}
                </Link>
            ))}
        </span>
    );
}

function Tier({ label, notes, layer }: { label: string; notes: Note[]; layer?: string }) {
    const href = (slug: string) => searchHref({ note: slug, noteLayer: layer });
    return (
        <div className="tier">
            <span className="tier-label">{label}</span>
            <div className="tag-row">
                {notes.length > 0 ? (
                    notes.map((n, i) => (
                        <Link key={`${n.slug}-${i}`} href={href(n.slug)} className="note-chip">
                            <span className="note-ico" aria-hidden="true">{noteIcon(n.name, n.category)}</span>
                            {n.name}
                        </Link>
                    ))
                ) : (
                    <span className="faint">Bilgi yok</span>
                )}
            </div>
        </div>
    );
}

function FacetGroup({
    title,
    items,
    empty = "Bilgi yok",
    hrefFor,
}: {
    title: string;
    items: ScoredRef[];
    empty?: string;
    hrefFor?: (slug: string) => string;
}) {
    const hasVotes = items?.some((i) => i.votes > 0 || i.score > 0);
    const best = hasVotes ? Math.max(...items.map((i) => i.score)) : 0;

    return (
        <div className="facet-group">
            <div className="panel-title">{title}</div>
            {hasVotes ? (
                <div className="facet-tiles">
                    {items.map((i) => {
                        const tile = (
                            <>
                                <span className="facet-ico" aria-hidden="true">{FACET_ICONS[i.slug] ?? "•"}</span>
                                <span className="facet-name">{i.name}</span>
                                <span className="facet-val">%{i.score}</span>
                            </>
                        );
                        const cls = `facet-tile${i.score === best && best > 0 ? " is-best" : ""}`;
                        return hrefFor ? (
                            <Link key={i.slug} href={hrefFor(i.slug)} className={cls} title={`${i.name} — %${i.score}`}>
                                {tile}
                            </Link>
                        ) : (
                            <div key={i.slug} className={cls} title={`${i.name} — %${i.score}`}>
                                {tile}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="empty">{empty}</p>
            )}
        </div>
    );
}

function VotePanel({
    title,
    items,
}: {
    title: string;
    items: VoteBar[];
}) {
    const total = items?.reduce((sum, i) => sum + i.votes, 0) ?? 0;

    return (
        <div className="vote-panel">
            <div className="panel-title">
                {title}
                {total > 0 && <span className="muted"> · {total.toLocaleString("tr-TR")} oy</span>}
            </div>
            {total > 0 ? (
                <Bars items={toScored(items)} sort={false} />
            ) : (
                <p className="empty">Bilgi yok</p>
            )}
        </div>
    );
}

function getVoteSummaryText(
    perfumeName: string,
    type: "rating" | "longevity" | "sillage" | "gender" | "price",
    items: VoteBar[],
    total: number
): string | null {
    const active = items.filter((i) => i.votes > 0);
    if (!active.length) return null;

    const formattedTotal = total.toLocaleString("tr-TR");

    if (type === "rating") {
        const parts = active.map((i) => {
            const v = i.votes.toLocaleString("tr-TR");
            if (i.slug === "bayildim") return `${v} kişi bayıldığını`;
            if (i.slug === "begendim") return `${v} kişi beğendiğini`;
            if (i.slug === "idare-eder") return `${v} kişi idare eder bulduğunu`;
            if (i.slug === "sevmedim") return `${v} kişi sevmediğini`;
            if (i.slug === "nefret-ettim") return `${v} kişi nefret ettiğini`;
            return `${v} kişi ${i.name.toLocaleLowerCase("tr-TR")}`;
        });
        return `${perfumeName} parfümünü toplam ${formattedTotal} kişi oyladı; ${parts.join(", ")} belirtti.`;
    }

    if (type === "longevity") {
        const parts = active.map((i) => {
            const v = i.votes.toLocaleString("tr-TR");
            if (i.slug === "cok-uzun-sureli") return `${v} kişi çok uzun süreli / kalıcı`;
            if (i.slug === "uzun-sureli") return `${v} kişi uzun süreli`;
            if (i.slug === "orta") return `${v} kişi orta süreli`;
            if (i.slug === "zayif") return `${v} kişi zayıf`;
            if (i.slug === "cok-zayif") return `${v} kişi çok zayıf`;
            return `${v} kişi ${i.name.toLocaleLowerCase("tr-TR")}`;
        });
        return `${perfumeName} kalıcılık performansını toplam ${formattedTotal} kişi oyladı; ${parts.join(", ")} olarak değerlendirdi.`;
    }

    if (type === "sillage") {
        const parts = active.map((i) => {
            const v = i.votes.toLocaleString("tr-TR");
            if (i.slug === "cok-guclu") return `${v} kişi çok güçlü`;
            if (i.slug === "guclu") return `${v} kişi güçlü`;
            if (i.slug === "orta") return `${v} kişi orta`;
            if (i.slug === "kisisel") return `${v} kişi tene yakın`;
            return `${v} kişi ${i.name.toLocaleLowerCase("tr-TR")}`;
        });
        return `${perfumeName} koku yayılımını (fark edilirlik) toplam ${formattedTotal} kişi oyladı; ${parts.join(", ")} buldu.`;
    }

    if (type === "gender") {
        const parts = active.map((i) => {
            const v = i.votes.toLocaleString("tr-TR");
            if (i.slug === "erkek") return `${v} kişi erkek için`;
            if (i.slug === "daha-cok-erkek") return `${v} kişi daha çok erkek için`;
            if (i.slug === "unisex") return `${v} kişi unisex`;
            if (i.slug === "daha-cok-kadin") return `${v} kişi daha çok kadın için`;
            if (i.slug === "kadin") return `${v} kişi kadın için`;
            return `${v} kişi ${i.name.toLocaleLowerCase("tr-TR")}`;
        });
        return `${perfumeName} cinsiyet profilini toplam ${formattedTotal} kişi oyladı; ${parts.join(", ")} uygun gördü.`;
    }

    if (type === "price") {
        const parts = active.map((i) => {
            const v = i.votes.toLocaleString("tr-TR");
            if (i.slug === "cok-pahali") return `${v} kişi aşırı pahalı`;
            if (i.slug === "pahali") return `${v} kişi pahalı`;
            if (i.slug === "makul") return `${v} kişi makul`;
            if (i.slug === "uygun") return `${v} kişi uygun`;
            if (i.slug === "cok-uygun") return `${v} kişi çok uygun`;
            return `${v} kişi ${i.name.toLocaleLowerCase("tr-TR")}`;
        });
        return `${perfumeName} fiyat/değer oranını toplam ${formattedTotal} kişi oyladı; ${parts.join(", ")} bulduğunu belirtti.`;
    }

    return null;
}

function Bars({ items, sort = true }: { items: ScoredRef[]; sort?: boolean }) {
    if (!items?.length) return <p className="empty">Bilgi yok</p>;
    const rows = sort ? [...items].sort((a, b) => b.score - a.score) : items;
    return (
        <div className="bars">
            {rows.map((s) => (
                <div key={s.slug} className="bar-row">
                    <span>{s.name}</span>
                    <span className="bar-track">
                        <span className="bar-fill" style={{ width: `${s.score}%` }} />
                    </span>
                    <span className="bar-val">%{s.score}</span>
                </div>
            ))}
        </div>
    );
}

function RelatedBlock({
    title,
    items,
    currentPerfumeName,
    kind,
}: {
    title: string;
    items: RelatedPerfume[];
    currentPerfumeName: string;
    kind: "alternative" | "alsoLiked";
}) {
    return (
        <section className="block">
            <h2 className="block-title">{title}</h2>
            <div className="related-grid">
                {items.slice(0, 12).map((r) => {
                    const altText =
                        kind === "alsoLiked"
                            ? `${currentPerfumeName} sevenler ${r.brand.name} ${r.perfumeName} parfümünü de sevdi`
                            : `${currentPerfumeName} benzeri ${r.brand.name} ${r.perfumeName} parfümü`;
                    return (
                        <Link
                            key={r.perfumeSlug}
                            href={perfumeHref(r.path, r.perfumeSlug)}
                            className="related-item"
                            title={`${r.brand.name} ${r.perfumeName} incele`}
                        >
                            <img
                                src={mediaUrl(r.imageUrl) || PLACEHOLDER}
                                alt={altText}
                                loading="lazy"
                            />
                            <span className="related-brand">{r.brand.name}</span>
                            <span className="related-name">{r.perfumeName}</span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function buildEnrichedFaq(
    baseFaq: FaqItem[] | undefined,
    fullPerfumeName: string,
    rawPerfumeName: string,
    brandName: string,
    fragranceFamily?: string,
    fragranceFamilyDescription?: string,
    notes?: { top: Note[]; middle: Note[]; base: Note[]; all: Note[] },
    ratingBreakdown?: VoteBar[],
    longevity?: VoteBar[],
    sillage?: VoteBar[],
    genderVotes?: VoteBar[],
    priceVotes?: VoteBar[]
): FaqItem[] {
    const list: FaqItem[] = baseFaq
        ? baseFaq.map((f) => {
              let q = f.question;
              let a = f.answer;
              if (fullPerfumeName !== rawPerfumeName) {
                  if (brandName) {
                      const reverseRegex = new RegExp(
                          `\\b(${rawPerfumeName}\\s+${brandName}|${brandName}\\s+${rawPerfumeName})\\b`,
                          "gi"
                      );
                      q = q.replace(reverseRegex, fullPerfumeName);
                      a = a.replace(reverseRegex, fullPerfumeName);
                  }
                  const rawRegex = new RegExp(`\\b${rawPerfumeName}\\b`, "gi");
                  q = q.replace(rawRegex, (match, offset, str) => {
                      if (brandName) {
                          const before = str.slice(Math.max(0, offset - brandName.length - 2), offset);
                          const after = str.slice(offset + match.length, offset + match.length + brandName.length + 2);
                          if (before.toLowerCase().includes(brandName.toLowerCase()) || after.toLowerCase().includes(brandName.toLowerCase())) {
                              return match;
                          }
                      }
                      return fullPerfumeName;
                  });
                  a = a.replace(rawRegex, (match, offset, str) => {
                      if (brandName) {
                          const before = str.slice(Math.max(0, offset - brandName.length - 2), offset);
                          const after = str.slice(offset + match.length, offset + match.length + brandName.length + 2);
                          if (before.toLowerCase().includes(brandName.toLowerCase()) || after.toLowerCase().includes(brandName.toLowerCase())) {
                              return match;
                          }
                      }
                      return fullPerfumeName;
                  });
              }
              return { question: q, answer: a };
          })
        : [];

    // Koku ailesi sorusu (bilgi yoksa eklenmez)
    if (fragranceFamily && fragranceFamily.trim()) {
        const hasFamilyQ = list.some((f) => f.question.toLowerCase().includes("koku ailesi"));
        if (!hasFamilyQ) {
            const answer = `${fullPerfumeName}, ${fragranceFamily} koku ailesine aittir.${
                fragranceFamilyDescription ? ` ${fragranceFamilyDescription}` : ""
            }`;
            const insertIndex = list.length >= 3 ? 3 : list.length;
            list.splice(insertIndex, 0, {
                question: `${fullPerfumeName} hangi koku ailesine aittir?`,
                answer,
            });
        }
    }

    // Notalar sorusu (bilgi yoksa eklenmez)
    if (notes) {
        const hasTop = notes.top && notes.top.length > 0;
        const hasMiddle = notes.middle && notes.middle.length > 0;
        const hasBase = notes.base && notes.base.length > 0;
        const hasAll = notes.all && notes.all.length > 0;

        const hasNotesQ = list.some(
            (f) =>
                f.question.toLowerCase().includes("notaları nelerdir") ||
                f.question.toLowerCase().includes("koku piramidi")
        );

        if (!hasNotesQ) {
            if (hasTop || hasMiddle || hasBase) {
                const parts: string[] = [];
                if (hasTop) parts.push(`üst notalarda ${notes.top.map((n) => n.name).join(", ")}`);
                if (hasMiddle) parts.push(`orta (kalp) notalarda ${notes.middle.map((n) => n.name).join(", ")}`);
                if (hasBase) parts.push(`dip notalarda ${notes.base.map((n) => n.name).join(", ")}`);

                const answer = `${fullPerfumeName} koku piramidinde; ${parts.join("; ")} yer almaktadır.`;
                const insertIndex = list.length >= 4 ? 4 : list.length;
                list.splice(insertIndex, 0, {
                    question: `${fullPerfumeName} parfümünün koku piramidi ve notaları nelerdir?`,
                    answer,
                });
            } else if (hasAll) {
                const answer = `${fullPerfumeName} parfümünün öne çıkan koku notaları şunlardır: ${notes.all
                    .map((n) => n.name)
                    .join(", ")}.`;
                const insertIndex = list.length >= 4 ? 4 : list.length;
                list.splice(insertIndex, 0, {
                    question: `${fullPerfumeName} parfümünün notaları nelerdir?`,
                    answer,
                });
            }
        }
    }

    // Kalıcılık ve Yayılım soruları (kullanıcı oylamalarından)
    const lonTotal = longevity?.reduce((sum, i) => sum + i.votes, 0) ?? 0;
    const lonSummary = lonTotal > 0 && longevity ? getVoteSummaryText(fullPerfumeName, "longevity", longevity, lonTotal) : null;

    const silTotal = sillage?.reduce((sum, i) => sum + i.votes, 0) ?? 0;
    const silSummary = silTotal > 0 && sillage ? getVoteSummaryText(fullPerfumeName, "sillage", sillage, silTotal) : null;

    const combinedIdx = list.findIndex(
        (f) =>
            f.question.toLowerCase().includes("kalıcı") &&
            (f.question.toLowerCase().includes("yayılım") || f.question.toLowerCase().includes("silaj"))
    );

    if (combinedIdx >= 0 && (lonSummary || silSummary)) {
        const stats = [lonSummary, silSummary].filter(Boolean).join(" ");
        list[combinedIdx].answer = `${list[combinedIdx].answer} Topluluk oylamasına göre; ${stats}`;
    } else {
        if (lonSummary) {
            const idx = list.findIndex((f) => f.question.toLowerCase().includes("kalıcı"));
            if (idx >= 0) {
                list[idx].answer = `${list[idx].answer} Topluluk oylamasına göre; ${lonSummary}`;
            } else {
                list.push({
                    question: `${fullPerfumeName} kalıcılığı nasıl ve ne kadar sürüyor?`,
                    answer: lonSummary,
                });
            }
        }
        if (silSummary) {
            const idx = list.findIndex(
                (f) =>
                    f.question.toLowerCase().includes("yayılım") ||
                    f.question.toLowerCase().includes("fark edilirlik") ||
                    f.question.toLowerCase().includes("silaj")
            );
            if (idx >= 0) {
                list[idx].answer = `${list[idx].answer} Topluluk oylamasına göre; ${silSummary}`;
            } else {
                list.push({
                    question: `${fullPerfumeName} yayılımı ve fark edilirliği nasıl?`,
                    answer: silSummary,
                });
            }
        }
    }

    // Kullanıcı beğenisi / genel puan dağılımı (kullanıcı oylamalarından)
    if (ratingBreakdown && ratingBreakdown.length > 0) {
        const total = ratingBreakdown.reduce((sum, i) => sum + i.votes, 0);
        if (total > 0) {
            const hasRatingQ = list.some(
                (f) =>
                    f.question.toLowerCase().includes("beğeniliyor mu") ||
                    f.question.toLowerCase().includes("puan dağılımı") ||
                    f.question.toLowerCase().includes("kullanıcı puanı")
            );
            if (!hasRatingQ) {
                const answer = getVoteSummaryText(fullPerfumeName, "rating", ratingBreakdown, total);
                if (answer) {
                    list.push({
                        question: `${fullPerfumeName} kullanıcılar tarafından beğeniliyor mu?`,
                        answer,
                    });
                }
            }
        }
    }

    // Cinsiyet profili (kullanıcı oylamalarından)
    if (genderVotes && genderVotes.length > 0) {
        const total = genderVotes.reduce((sum, i) => sum + i.votes, 0);
        if (total > 0) {
            const hasGenderQ = list.some(
                (f) =>
                    f.question.toLowerCase().includes("kadın parfümü") ||
                    f.question.toLowerCase().includes("erkek parfümü") ||
                    f.question.toLowerCase().includes("cinsiyet")
            );
            if (!hasGenderQ) {
                const answer = getVoteSummaryText(fullPerfumeName, "gender", genderVotes, total);
                if (answer) {
                    list.push({
                        question: `${fullPerfumeName} kadın parfümü mü erkek parfümü mü?`,
                        answer,
                    });
                }
            }
        }
    }

    // Fiyat / değer değerlendirmesi (kullanıcı oylamalarından)
    if (priceVotes && priceVotes.length > 0) {
        const total = priceVotes.reduce((sum, i) => sum + i.votes, 0);
        if (total > 0) {
            const hasPriceQ = list.some(
                (f) =>
                    f.question.toLowerCase().includes("fiyatını hak") ||
                    f.question.toLowerCase().includes("fiyat/değer") ||
                    f.question.toLowerCase().includes("fiyat/performans")
            );
            if (!hasPriceQ) {
                const answer = getVoteSummaryText(fullPerfumeName, "price", priceVotes, total);
                if (answer) {
                    list.push({
                        question: `${fullPerfumeName} fiyatını hak ediyor mu, fiyat/değer performansı nasıl?`,
                        answer,
                    });
                }
            }
        }
    }

    return list;
}
