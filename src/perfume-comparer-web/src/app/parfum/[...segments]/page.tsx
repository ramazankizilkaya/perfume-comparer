import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Score from "@/components/Score";
import Stars from "@/components/Stars";
import Breadcrumb from "@/components/Breadcrumb";
import PerfumeHeroMedia from "@/components/PerfumeHeroMedia";
import PerfumeReviewButton from "@/components/PerfumeReviewButton";
import PerfumeUserPhotos from "@/components/PerfumeUserPhotos";
import PerfumeCommentsSection, { type CommentData } from "@/components/PerfumeCommentsSection";
import { API_BASE, genderLabel, brandHref, perfumeHref, mediaUrl } from "@/lib/urls";
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
    if (!slug) {
        return { title: "Parfüm | Aura Compare" };
    }

    try {
        const res = await fetch(`${API_BASE}/api/perfumes/${slug}`, { next: { revalidate: 60 } });
        if (!res.ok) {
            return { title: "Parfüm Bulunamadı | Aura Compare" };
        }
        const perfume: PerfumeDetail = await res.json();
        const brandName = perfume.brand?.name ?? "";
        const title = `${perfume.name} - ${brandName} Parfüm İncelemesi ve Notaları | Aura Compare`;

        const descParts: string[] = [];
        if (perfume.gender) descParts.push(genderLabel(perfume.gender));
        if (perfume.fragranceFamily) descParts.push(`${perfume.fragranceFamily} koku ailesi`);
        if (perfume.accords?.length > 0) {
            descParts.push(`ana akorlar: ${perfume.accords.slice(0, 3).map((a) => a.name).join(", ")}`);
        }
        if (perfume.releaseYear) descParts.push(`${perfume.releaseYear} çıkışlı`);
        const description = `${perfume.name} (${brandName}) ${descParts.join(" · ")}. Koku piramidi, kalıcılık ve kullanıcı yorumları.`;
        const img = mediaUrl(perfume.imageUrl) || PLACEHOLDER;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: img ? [{ url: img }] : [],
            },
            alternates: {
                canonical: `/parfum/${perfume.path || slug}`,
            },
        };
    } catch {
        return { title: "Parfüm | Aura Compare" };
    }
}

export default async function PerfumeDetailPage({ params }: PageProps) {
    const { segments } = await params;
    const slug = segments?.[segments.length - 1];

    if (!slug) {
        return (
            <div className="state">
                <h2>Parfüm bulunamadı</h2>
                <p>Geçersiz sayfa bağlantısı.</p>
                <Link href="/" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
                    Anasayfaya dön
                </Link>
            </div>
        );
    }

    let perfume: PerfumeDetail | null = null;
    let comments: CommentData[] = [];
    let userPhotos: { id: number; imageUrl: string; authorName: string; createdAt: string }[] = [];

    try {
        const [pRes, cRes, photosRes] = await Promise.all([
            fetch(`${API_BASE}/api/perfumes/${slug}`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes/${slug}/comments`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes/${slug}/photos`, { next: { revalidate: 60 } }),
        ]);

        if (pRes.ok) perfume = await pRes.json();
        if (cRes.ok) comments = await cRes.json();
        if (photosRes.ok) userPhotos = await photosRes.json();
    } catch {
        perfume = null;
    }

    if (!perfume) {
        return (
            <div className="state">
                <h2>Parfüm bulunamadı</h2>
                <p>Aradığınız koku sistemde yok.</p>
                <Link href="/" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
                    Anasayfaya dön
                </Link>
            </div>
        );
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

    return (
        <>
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
                            href={`/ara?gender=${genderSlug(perfume.gender)}`}
                        />
                        <FactCell
                            label="Koku ailesi"
                            value={perfume.fragranceFamily}
                            href={perfume.fragranceFamilySlug ? `/ara?family=${perfume.fragranceFamilySlug}` : undefined}
                        />
                        <FactCell
                            label="Çıkış yılı"
                            value={perfume.releaseYear?.toString()}
                        />
                        <FactCell
                            label="Konsantrasyon"
                            value={perfume.concentration}
                            href={perfume.concentrationSlug ? `/ara?concentration=${perfume.concentrationSlug}` : undefined}
                        />
                    </dl>

                    {perfume.description && <p className="detail-desc">{perfume.description}</p>}

                    <PerfumeReviewButton slug={perfume.slug} perfumeName={perfume.name} />
                </div>
            </div>

            <section className="block">
                <h2 className="block-title">Koku piramidi</h2>
                {hasPyramid ? (
                    <div className="pyramid">
                        <Tier label="Üst notalar" layer="ust" notes={perfume.notes.top} />
                        <Tier label="Orta notalar" layer="orta" notes={perfume.notes.middle} />
                        <Tier label="Alt notalar" layer="alt" notes={perfume.notes.base} />
                    </div>
                ) : (
                    <div className="pyramid">
                        <Tier label="Notalar" notes={allNotes} />
                        <p className="faint">
                            Bu parfüm için markası bir koku piramidi yayımlamamış; notalar tek liste hâlinde.
                        </p>
                    </div>
                )}
            </section>

            <div className="detail-body">
                <PerfumeUserPhotos
                    slug={perfume.slug}
                    perfumeName={perfume.name}
                    initialPhotos={userPhotos}
                />

                <section className="block">
                    <h2 className="block-title">Öne çıkan özellikler</h2>
                    <table className="spec">
                        <tbody>
                            <SpecRow label="Marka">
                                <SpecLink value={perfume.brand.name} href={`/ara?brand=${perfume.brand.slug}`} />
                            </SpecRow>
                            <SpecRow label="Koku ailesi">
                                <SpecLink
                                    value={perfume.fragranceFamily}
                                    href={perfume.fragranceFamilySlug ? `/ara?family=${perfume.fragranceFamilySlug}` : undefined}
                                />
                            </SpecRow>
                            <SpecRow label="Cinsiyet">
                                <SpecLink value={genderLabel(perfume.gender)} href={`/ara?gender=${genderSlug(perfume.gender)}`} />
                            </SpecRow>
                            <SpecRow label="Konsantrasyon">
                                <SpecLink
                                    value={perfume.concentration}
                                    href={perfume.concentrationSlug ? `/ara?concentration=${perfume.concentrationSlug}` : undefined}
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
                                <SpecLinkList items={perfume.accords.slice(0, 5)} hrefFor={(s) => `/ara?accord=${s}`} />
                            </SpecRow>
                            {hasPyramid ? (
                                <>
                                    <SpecRow label="Üst notalar">
                                        <SpecLinkList items={perfume.notes.top} hrefFor={(s) => `/ara?note=${s}&noteLayer=ust`} />
                                    </SpecRow>
                                    <SpecRow label="Orta notalar">
                                        <SpecLinkList items={perfume.notes.middle} hrefFor={(s) => `/ara?note=${s}&noteLayer=orta`} />
                                    </SpecRow>
                                    <SpecRow label="Alt notalar">
                                        <SpecLinkList items={perfume.notes.base} hrefFor={(s) => `/ara?note=${s}&noteLayer=alt`} />
                                    </SpecRow>
                                </>
                            ) : (
                                <SpecRow label="Notalar">
                                    <SpecLinkList items={perfume.notes.all} hrefFor={(s) => `/ara?note=${s}`} />
                                </SpecRow>
                            )}
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
                                    <SpecLink value={`${bestSeason.name} (%${bestSeason.score})`} href={`/ara?season=${bestSeason.slug}`} />
                                </SpecRow>
                            )}
                            {bestTime && bestTime.votes > 0 && (
                                <SpecRow label="Gün içi kullanım">
                                    <SpecLink value={bestTime.name} />
                                </SpecRow>
                            )}
                            {bestAge && bestAge.votes > 0 && (
                                <SpecRow label="En yaygın yaş grubu">
                                    <SpecLink value={`${bestAge.name} (%${bestAge.score})`} href={`/ara?ageGroup=${bestAge.slug}`} />
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
                                    href={`/ara?accord=${a.slug}`}
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
                        <FacetGroup title="Mevsim uyumu" items={perfume.seasons} hrefFor={(s) => `/ara?season=${s}`} />
                        <FacetGroup title="Gündüz / gece" items={perfume.timeOfDay} />
                        <FacetGroup
                            title="Yaş grubu"
                            items={perfume.usageCount > 0 ? perfume.ageGroups : []}
                            empty='Henüz kimse bildirmedi. "Bu parfümü kullanıyorum" diyerek ilk siz olun.'
                            hrefFor={(s) => `/ara?ageGroup=${s}`}
                        />
                    </div>
                </section>

                {perfume.alternatives.length > 0 && (
                    <RelatedBlock
                        title="Benzer kokular"
                        items={perfume.alternatives}
                    />
                )}

                {perfume.alsoLiked.length > 0 && (
                    <RelatedBlock
                        title="Bu parfümü sevenler şunları da sevdi"
                        items={perfume.alsoLiked}
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

                <PerfumeCommentsSection
                    key={perfume.slug}
                    slug={perfume.slug}
                    initialComments={comments}
                />
            </div>
        </>
    );
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
    const href = (slug: string) => (layer ? `/ara?note=${slug}&noteLayer=${layer}` : `/ara?note=${slug}`);
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

function VotePanel({ title, items }: { title: string; items: VoteBar[] }) {
    const total = items?.reduce((sum, i) => sum + i.votes, 0) ?? 0;
    return (
        <div className="vote-panel">
            <div className="panel-title">
                {title}
                {total > 0 && <span className="muted"> · {total.toLocaleString("tr-TR")} oy</span>}
            </div>
            {total > 0 ? <Bars items={toScored(items)} sort={false} /> : <p className="empty">Bilgi yok</p>}
        </div>
    );
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
}: {
    title: string;
    items: RelatedPerfume[];
}) {
    return (
        <section className="block">
            <h2 className="block-title">{title}</h2>
            <div className="related-grid">
                {items.slice(0, 12).map((r) => (
                    <Link key={r.perfumeSlug} href={perfumeHref(r.path, r.perfumeSlug)} className="related-item">
                        <img src={mediaUrl(r.imageUrl) || PLACEHOLDER} alt="" loading="lazy" />
                        <span className="related-brand">{r.brand.name}</span>
                        <span className="related-name">{r.perfumeName}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
