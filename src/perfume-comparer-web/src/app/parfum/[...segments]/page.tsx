"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Icon from "@/components/Icon";
import Stars, { StarInput } from "@/components/Stars";
import Score from "@/components/Score";
import FavButton from "@/components/FavButton";
import CompareButton from "@/components/CompareButton";
import LoginPrompt from "@/components/LoginPrompt";
import Breadcrumb from "@/components/Breadcrumb";
import { API_BASE, formatDate, genderLabel } from "@/lib/urls";
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
}

interface BreadcrumbItem {
    level: string;
    label: string;
    slug: string;
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
    notes: { top: Note[]; middle: Note[]; base: Note[] };
    seasons: ScoredRef[];
    ageGroups: ScoredRef[];
    breadcrumb: BreadcrumbItem[];
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

export default function PerfumeDetailPage() {
    const params = useParams();
    const segments = (params.segments as string[]) ?? [];
    const slug = segments[segments.length - 1];

    const { token } = useAuth();
    const [perfume, setPerfume] = useState<PerfumeDetail | null>(null);
    const [comments, setComments] = useState<CommentData[]>([]);
    const [loading, setLoading] = useState(true);

    const [rating, setRating] = useState(5);
    const [commentText, setCommentText] = useState("");
    const [commentStatus, setCommentStatus] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!slug) return;
        (async () => {
            setLoading(true);
            try {
                const [pRes, cRes] = await Promise.all([
                    fetch(`${API_BASE}/api/perfumes/${slug}`),
                    fetch(`${API_BASE}/api/perfumes/${slug}/comments`),
                ]);
                setPerfume(pRes.ok ? await pRes.json() : null);
                if (cRes.ok) setComments(await cRes.json());
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
    const bestSeason = perfume.seasons?.length ? [...perfume.seasons].sort((a, b) => b.score - a.score)[0] : null;
    const bestAge = perfume.ageGroups?.length ? [...perfume.ageGroups].sort((a, b) => b.score - a.score)[0] : null;

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
                <figure className="detail-media">
                    <img src={perfume.imageUrl || PLACEHOLDER} alt={perfume.name} />
                </figure>

                <div>
                    <div className="detail-brand">{perfume.brand.name}</div>
                    <h1 className="detail-name">{perfume.name}</h1>

                    <div className="detail-rating">
                        <Stars value={perfume.avgRating} size={20} showValue count={perfume.ratingCount} />
                    </div>

                    <div className="tag-row">
                        {perfume.fragranceFamily && (
                            <span className="tag tag-family" title={perfume.fragranceFamilyDescription}>
                                {perfume.fragranceFamily}
                            </span>
                        )}
                        <span className="tag">{genderLabel(perfume.gender)}</span>
                        {perfume.concentration && <span className="tag">{perfume.concentration}</span>}
                        {perfume.releaseYear && <span className="tag">{perfume.releaseYear}</span>}
                    </div>

                    {perfume.fragranceFamilyDescription && (
                        <p className="detail-lede">{perfume.fragranceFamilyDescription}</p>
                    )}

                    <div className="detail-actions">
                        <CompareButton perfume={ref} />
                        <FavButton perfume={ref} />
                    </div>
                </div>
            </div>

            <div className="detail-body">
                <div className="col-main">
                    {perfume.description && (
                        <section className="block">
                            <h2 className="block-title">Ürün açıklaması</h2>
                            <p className="prose">{perfume.description}</p>
                        </section>
                    )}

                    <section className="block">
                        <h2 className="block-title">Öne çıkan özellikler</h2>
                        <table className="spec">
                            <tbody>
                                <SpecRow label="Marka" value={perfume.brand.name} />
                                <SpecRow label="Koku ailesi" value={perfume.fragranceFamily} />
                                <SpecRow label="Cinsiyet" value={genderLabel(perfume.gender)} />
                                <SpecRow label="Konsantrasyon" value={perfume.concentration} />
                                <SpecRow label="Çıkış yılı" value={perfume.releaseYear?.toString()} />
                                <SpecRow label="Puan" value={`${perfume.avgRating.toFixed(1)} / 5 (${perfume.ratingCount} değerlendirme)`} />
                                <SpecRow label="Üst notalar" value={perfume.notes.top.map((n) => n.name).join(", ")} />
                                <SpecRow label="Orta notalar" value={perfume.notes.middle.map((n) => n.name).join(", ")} />
                                <SpecRow label="Alt notalar" value={perfume.notes.base.map((n) => n.name).join(", ")} />
                                {bestSeason && <SpecRow label="En uygun mevsim" value={`${bestSeason.name} (%${bestSeason.score})`} />}
                                {bestAge && <SpecRow label="En uygun yaş grubu" value={`${bestAge.name} (%${bestAge.score})`} />}
                            </tbody>
                        </table>
                    </section>

                    <section className="block">
                        <h2 className="block-title">Koku piramidi</h2>
                        <div className="pyramid">
                            <Tier label="Üst notalar" notes={perfume.notes.top} />
                            <Tier label="Orta notalar" notes={perfume.notes.middle} />
                            <Tier label="Alt notalar" notes={perfume.notes.base} />
                        </div>
                    </section>

                    <section className="block">
                        <h2 className="block-title">Yorumlar ({userComments.length})</h2>

                        {aiSummary && <AiSummary comment={aiSummary} />}

                        <div className="comment-form-wrap">
                            <LoginPrompt label="Yorum yapmak ve puan vermek için giriş yapın">
                                <form onSubmit={submitComment}>
                                    <div className="form-group">
                                        <label>Puanınız</label>
                                        <StarInput value={rating} onChange={setRating} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="c-body">Yorumunuz</label>
                                        <textarea
                                            id="c-body"
                                            className="textarea"
                                            placeholder="Kalıcılık, yayılım ve genel izleniminizi yazın…"
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button className="btn btn-primary" disabled={sending}>
                                        <Icon name="send" size={14} /> Gönder
                                    </button>
                                    {commentStatus && <p className="form-note ok">{commentStatus}</p>}
                                </form>
                            </LoginPrompt>
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

                <aside className="detail-aside">
                    <div className="panel">
                        <div className="panel-title">Genel puan</div>
                        <div className="panel-score">
                            <Score value={perfume.avgRating} count={perfume.ratingCount} lg caption="/ 100" />
                            <div className="panel-score-meta">
                                <strong>{perfume.avgRating.toFixed(1)} / 5</strong>
                                {perfume.ratingCount} değerlendirme
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-title">Mevsim uyumu</div>
                        <Bars items={perfume.seasons} />
                    </div>

                    <div className="panel">
                        <div className="panel-title">Yaş grubu</div>
                        <Bars items={perfume.ageGroups} />
                    </div>
                </aside>
            </div>
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

function SpecRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <tr>
            <th>{label}</th>
            <td>{value || "—"}</td>
        </tr>
    );
}

function Tier({ label, notes }: { label: string; notes: Note[] }) {
    return (
        <div className="tier">
            <span className="tier-label">{label}</span>
            <div className="tag-row">
                {notes.length > 0 ? (
                    notes.map((n, i) => (
                        <span key={i} className="note-chip">
                            <span className="note-ico" aria-hidden="true">{noteIcon(n.name, n.category)}</span>
                            {n.name}
                        </span>
                    ))
                ) : (
                    <span className="faint">Bilgi yok</span>
                )}
            </div>
        </div>
    );
}

function Bars({ items }: { items: ScoredRef[] }) {
    if (!items?.length) return <p className="empty">Bilgi yok</p>;
    const sorted = [...items].sort((a, b) => b.score - a.score);
    return (
        <div className="bars">
            {sorted.map((s) => (
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
