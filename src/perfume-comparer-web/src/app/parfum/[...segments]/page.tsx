"use client";

import { useState, useEffect, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import Stars, { StarInput } from "@/components/Stars";
import Score from "@/components/Score";
import FavButton from "@/components/FavButton";
import CompareButton from "@/components/CompareButton";
import Breadcrumb from "@/components/Breadcrumb";
import { type AgeGroupScore } from "@/components/UsageVote";
import ImageLightboxModal from "@/components/ImageLightboxModal";
import PerfumeReviewModal from "@/components/PerfumeReviewModal";
import { API_BASE, formatDate, genderLabel, brandHref, perfumeHref, mediaUrl } from "@/lib/urls";
import { noteIcon } from "@/lib/notes";
import { useAuth, type PerfumeRef } from "@/lib/stores";

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

export interface CommentData {
    id: number;
    body: string;
    createdAt: string;
    updatedAt?: string | null;
    isAiSummary: boolean;
    authorName?: string | null;
    rating?: number;
}

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800";

/** Mevsim / gün içi / yaş grubu için ikonlar: uzun yüzde çubuğu yerine tek bakışta okunur. */
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

/** /ara cinsiyet filtresi erkek/kadin/unisex slug'ları bekler; detay DTO'su enum adı döner. */
function genderSlug(gender?: string | null): string {
    if (gender === "Male") return "erkek";
    if (gender === "Female") return "kadin";
    return "unisex";
}

export default function PerfumeDetailPage() {
    const params = useParams();
    const segments = (params.segments as string[]) ?? [];
    const slug = segments[segments.length - 1];

    const { token, user } = useAuth();
    const pathname = usePathname();
    const [perfume, setPerfume] = useState<PerfumeDetail | null>(null);
    const [comments, setComments] = useState<CommentData[]>([]);
    const [userPhotos, setUserPhotos] = useState<{ id: number; imageUrl: string; authorName: string; createdAt: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState("");
    const [lightboxAlt, setLightboxAlt] = useState("");
    const [reviewModalOpen, setReviewModalOpen] = useState(false);

    const [rating, setRating] = useState(5);
    const [commentText, setCommentText] = useState("");
    const [commentStatus, setCommentStatus] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!slug) return;
        (async () => {
            setLoading(true);
            try {
                const [pRes, cRes, photosRes] = await Promise.all([
                    fetch(`${API_BASE}/api/perfumes/${slug}`),
                    fetch(`${API_BASE}/api/perfumes/${slug}/comments`),
                    fetch(`${API_BASE}/api/perfumes/${slug}/photos`),
                ]);
                setPerfume(pRes.ok ? await pRes.json() : null);

                let loaded: CommentData[] = [];
                if (cRes.ok) {
                    loaded = await cRes.json();
                    setComments(loaded);
                }
                if (photosRes.ok) setUserPhotos(await photosRes.json());

                // Özeti olmayan parfümlerde AI özetini arka planda ürettir.
                // Eşiğin altındaysa API 204 döner ve sayfa olduğu gibi kalır.
                if (!loaded.some((c) => c.isAiSummary)) {
                    try {
                        const aiRes = await fetch(`${API_BASE}/api/perfumes/${slug}/ai-summary`, { method: "POST" });
                        if (aiRes.ok && aiRes.status !== 204) {
                            const fresh = await aiRes.json();
                            setComments((prev) => [fresh as CommentData, ...prev]);
                        }
                    } catch {
                        /* özet üretilemezse sayfa özetsiz çalışmaya devam eder */
                    }
                }
            } catch {
                setPerfume(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [slug]);

    const submitComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setSending(true);
        setCommentStatus("");
        try {
            const res = await fetch(`${API_BASE}/api/perfumes/${slug}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ rating, content: commentText }),
            });
            if (res.ok) {
                setCommentStatus("Yorumunuz eklendi.");
                setCommentText("");
                const fresh = await fetch(`${API_BASE}/api/perfumes/${slug}/comments`);
                if (fresh.ok) setComments(await fresh.json());
            } else {
                setCommentStatus("Yorum eklenemedi.");
            }
        } catch {
            setCommentStatus("Bağlantı hatası.");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="state">
                <div className="spinner" />
                <p>Yükleniyor…</p>
            </div>
        );
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

    const aiSummary = comments.find((c) => c.isAiSummary) ?? null;
    const userComments = comments.filter((c) => !c.isAiSummary);
    const bestSeason = pickTop(perfume.seasons);
    const bestTime = pickTop(perfume.timeOfDay);
    const bestAge = pickTop(perfume.ageGroups);
    const topLongevity = pickTopBar(perfume.longevity);
    const topSillage = pickTopBar(perfume.sillage);

    // Piramit yayımlamayan markalarda notalar tek düz liste olarak gelir.
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

    const openLightbox = (src: string, alt: string) => {
        setLightboxSrc(src);
        setLightboxAlt(alt);
        setLightboxOpen(true);
    };

    return (
        <>
            <Breadcrumb items={perfume.breadcrumb} />

            {/* Üst künye: solda büyük görsel, sağda marka/model/puan + künye + açıklama. */}
            <div className="detail-head">
                <div className="detail-media-col">
                    <figure
                        className="detail-media"
                        onClick={() => openLightbox(mediaUrl(perfume.imageUrl) || PLACEHOLDER, perfume.name)}
                        title="Fotoğrafı büyütmek için tıklayın"
                    >
                        <img src={mediaUrl(perfume.imageUrl) || PLACEHOLDER} alt={perfume.name} />
                        <div className="media-actions" onClick={(e) => e.stopPropagation()}>
                            <CompareButton perfume={ref} />
                            <FavButton perfume={ref} />
                        </div>
                    </figure>
                </div>

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

                    {/* Cinsiyet · aile · çıkış yılı: yan yana, tek satırda okunur künye. */}
                    <dl className="detail-facts">
                        <FactCell label="Ürün cinsi" value={genderLabel(perfume.gender)} href={`/ara?gender=${genderSlug(perfume.gender)}`} />
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

                    <button
                        type="button"
                        className="btn btn-primary detail-review-btn"
                        onClick={() => setReviewModalOpen(true)}
                    >
                        <Icon name="star" size={14} /> Bu parfümü değerlendir
                    </button>
                </div>
            </div>

            {/* Koku piramidi doğrudan künyenin altında. */}
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

            {/* Künye ve piramidin altındaki her şey tek kapsayıcıda. */}
            <div className="detail-body">
                {userPhotos.length > 0 && (
                    <section className="block user-photos-section">
                        <div className="block-title-row">
                            <h2 className="block-title">Kullanıcılardan gelen fotoğraflar ({userPhotos.length})</h2>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setReviewModalOpen(true)}
                            >
                                <Icon name="plus" size={12} /> Fotoğraf ekle
                            </button>
                        </div>
                        <div className="user-photos-slider">
                            {userPhotos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="user-photo-card"
                                    onClick={() =>
                                        openLightbox(
                                            mediaUrl(photo.imageUrl) || PLACEHOLDER,
                                            `${perfume.name} - @${photo.authorName}`)
                                    }
                                    title={`@${photo.authorName} tarafından yüklendi. Büyütmek için tıklayın.`}
                                >
                                    <img src={mediaUrl(photo.imageUrl)} alt={photo.authorName} className="user-photo-img" loading="lazy" />
                                    <span className="user-photo-author">@{photo.authorName}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

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

                {/* Mevsim / gün içi / yaş grubu: çubuk yerine ikon kutuları. */}
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

                {/* Bütün oylamalar tek panelde, yorumların hemen üstünde. */}
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

                <section className="block">
                    <h2 className="block-title">Yorumlar ({userComments.length})</h2>

                    {aiSummary && <AiSummary comment={aiSummary} />}

                    <div className="comment-form-wrap">
                        {/* Form giriş yapılmadan da görünür: kullanıcı yorum yazabileceğini
                            görsün diye alanlar kilitli gösterilir, üstte giriş linki durur. */}
                        {!user && (
                            <p className="login-prompt">
                                <Link href={`/giris?next=${encodeURIComponent(pathname)}`} className="link-more">
                                    Yorum yapmak ve puan vermek için giriş yapın
                                </Link>
                            </p>
                        )}
                        <form onSubmit={submitComment} className={user ? "comment-form" : "comment-form is-locked"}>
                            <div className="form-group">
                                <label>Puanınız</label>
                                <StarInput value={rating} onChange={setRating} disabled={!user} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="c-body">Yorumunuz</label>
                                <textarea
                                    id="c-body"
                                    className="textarea"
                                    placeholder="Kalıcılık, yayılım ve genel izleniminizi yazın…"
                                    value={commentText}
                                    disabled={!user}
                                    onChange={(e) => {
                                        e.target.setCustomValidity("");
                                        setCommentText(e.target.value);
                                    }}
                                    onInvalid={(e) =>
                                        e.currentTarget.setCustomValidity("Lütfen bu alanı doldurun.")
                                    }
                                    required
                                />
                            </div>
                            <button className="btn btn-primary" disabled={sending || !user}>
                                <Icon name="send" size={14} /> Gönder
                            </button>
                            {commentStatus && <p className="form-note ok">{commentStatus}</p>}
                        </form>
                    </div>

                    {userComments.length > 0 ? (
                        userComments.map((c) => (
                            <div key={c.id} className="comment">
                                <div className="comment-head">
                                    <span className="comment-author">{c.authorName ?? "Kullanıcı"}</span>
                                    <span className="comment-date">{formatDate(c.createdAt)}</span>
                                </div>
                                {c.rating && <Stars value={c.rating} size={16} />}
                                <p className="comment-body">{c.body}</p>
                            </div>
                        ))
                    ) : (
                        <p className="empty">Henüz yorum yok. İlk yorumu siz yazın.</p>
                    )}
                </section>
            </div>

            <ImageLightboxModal
                src={lightboxSrc}
                alt={lightboxAlt}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />

            <PerfumeReviewModal
                slug={perfume.slug}
                perfumeName={perfume.name}
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onReviewSubmitted={async () => {
                    const fresh = await fetch(`${API_BASE}/api/perfumes/${slug}`);
                    if (fresh.ok) setPerfume(await fresh.json());
                    const cFresh = await fetch(`${API_BASE}/api/perfumes/${slug}/comments`);
                    if (cFresh.ok) setComments(await cFresh.json());
                }}
                onPhotoUploaded={(photo) => {
                    setUserPhotos((prev) => [photo, ...prev]);
                }}
            />
        </>
    );
}

/** Yorumlardan üretilen AI özeti — ayrı bir tabloda değil, işaretli bir yorum. */
export function AiSummary({ comment }: { comment: CommentData }) {
    return (
        <div className="ai-summary">
            <div className="ai-summary-head">
                <Icon name="sparkle" size={14} />
                <span>Yorumların yapay zekâ özeti</span>
                <span className="comment-date">{formatDate(comment.updatedAt || comment.createdAt)}</span>
            </div>
            <p className="ai-summary-body">{comment.body}</p>
        </div>
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

/** Künyedeki tek hücre: etiket üstte, değer altta; değer filtrelenebilirse bağlantı olur. */
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

/** Nota/akor listesi: her öğe detaylı aramaya ilgili sorguyla gider. */
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

/** Mevsim, gün içi ve yaş grubu için ikon kutuları; en yüksek oyu alan vurgulanır. */
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
    const hasVotes = items.some((i) => i.votes > 0 || i.score > 0);
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
    const total = items.reduce((sum, i) => sum + i.votes, 0);
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
