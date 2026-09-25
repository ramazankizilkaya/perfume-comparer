"use client";

import { useState, useEffect, useRef, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Icon from "./Icon";
import Stars from "./Stars";
import Score from "./Score";
import LoginPrompt from "./LoginPrompt";
import ImageLightboxModal from "./ImageLightboxModal";
import { API_BASE, perfumeHref, formatDate, genderLabel, mediaUrl } from "@/lib/urls";
import { noteIcon } from "@/lib/notes";
import { useCompare, useAuth, MAX_COMPARE } from "@/lib/stores";

interface Note {
    name: string;
    slug: string;
    category?: string;
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

export interface PerfumeDetail {
    name: string;
    slug: string;
    brand: { name: string; slug: string };
    gender: string;
    concentration?: string;
    fragranceFamily?: string;
    releaseYear?: number;
    imageUrl?: string;
    avgRating: number;
    ratingCount: number;
    ratingBreakdown?: VoteBar[];
    accords: Accord[];
    notes: { top: Note[]; middle: Note[]; base: Note[]; all: Note[] };
    seasons: ScoredRef[];
    timeOfDay: ScoredRef[];
    longevity: VoteBar[];
    sillage: VoteBar[];
    genderVotes?: VoteBar[];
    priceVotes?: VoteBar[];
    ageGroups: ScoredRef[];
    usageCount: number;
    path: string;
}

interface ComparisonComment {
    id: number;
    body: string;
    createdAt: string;
    updatedAt?: string | null;
    isAiSummary: boolean;
    authorName?: string | null;
    preferredSlug?: string | null;
}

interface Suggestion {
    name: string;
    slug: string;
    brandName: string;
    imageUrl?: string;
    path: string;
}

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=400";

export default function CompareClient({
    initialPerfumes,
    initialSlugs,
}: {
    initialPerfumes: PerfumeDetail[];
    initialSlugs: string[];
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { remove } = useCompare();

    const slugs = useMemo(() => {
        const items = searchParams.get("items") || searchParams.get("parfumler");
        if (items) return items.split(",").filter(Boolean).slice(0, MAX_COMPARE);
        const pair = [searchParams.get("p1"), searchParams.get("p2")].filter(Boolean) as string[];
        if (pair.length > 0) return pair;
        return initialSlugs;
    }, [searchParams, initialSlugs]);

    const [perfumes, setPerfumes] = useState<PerfumeDetail[]>(initialPerfumes);
    const [loading, setLoading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            const initialMatches =
                slugs.length > 0 &&
                initialPerfumes.length === slugs.length &&
                slugs.every((s) => initialPerfumes.some((p) => p.slug === s));
            if (initialMatches) {
                return;
            }
        }

        if (slugs.length === 0) {
            setPerfumes([]);
            setLoading(false);
            return;
        }

        (async () => {
            setLoading(true);
            try {
                const list = await Promise.all(
                    slugs.map((s) => fetch(`${API_BASE}/api/perfumes/${s}`).then((r) => (r.ok ? r.json() : null))),
                );
                setPerfumes(list.filter(Boolean) as PerfumeDetail[]);
            } catch {
                setPerfumes([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [slugs]);

    const go = (next: string[]) => {
        router.replace(next.length ? `/karsilastir?items=${next.join(",")}` : "/karsilastir", { scroll: false });
    };

    const drop = (slug: string) => {
        remove(slug);
        go(slugs.filter((s) => s !== slug));
    };

    const add = (slug: string) => {
        if (slugs.includes(slug) || slugs.length >= MAX_COMPARE) return;
        go([...slugs, slug]);
    };

    return (
        <>
            <div className="compare-picker">
                <div>
                    <PerfumePicker
                        disabled={slugs.length >= MAX_COMPARE}
                        onPick={(s) => add(s.slug)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : perfumes.length === 0 ? null : (
                <>
                    <CompareMatrix
                        perfumes={perfumes}
                        onRemove={drop}
                        onImageClick={(src, alt) => setLightboxImage({ src, alt })}
                    />
                    {perfumes.length === 2 && (
                        <>
                            <AiComparisonAnalysis p1={perfumes[0]} p2={perfumes[1]} />
                            <ComparisonComments p1={perfumes[0]} p2={perfumes[1]} />
                        </>
                    )}
                    <ImageLightboxModal
                        isOpen={!!lightboxImage}
                        src={lightboxImage?.src ?? ""}
                        alt={lightboxImage?.alt ?? ""}
                        onClose={() => setLightboxImage(null)}
                    />
                </>
            )}
        </>
    );
}

function CompareMatrix({
    perfumes,
    onRemove,
    onImageClick,
}: {
    perfumes: PerfumeDetail[];
    onRemove: (slug: string) => void;
    onImageClick: (src: string, alt: string) => void;
}) {
    return (
        <div className="matrix-wrap">
            <table className="matrix">
                <tbody>
                    <tr className="matrix-head">
                        <th className="row-label" />
                        {perfumes.map((p) => (
                            <td key={p.slug}>
                                <button className="matrix-remove" onClick={() => onRemove(p.slug)} aria-label={`${p.name} kaldır`}>
                                    <Icon name="close" size={13} />
                                </button>
                                <div className="matrix-head-cell">
                                    <button
                                        type="button"
                                        className="matrix-img-btn"
                                        onClick={() => onImageClick(mediaUrl(p.imageUrl) || PLACEHOLDER, `${p.brand.name} ${p.name} parfümü`)}
                                        title={`${p.brand.name} ${p.name} - Büyütmek için tıklayın`}
                                        aria-label={`${p.brand.name} ${p.name} görselini büyüt`}
                                    >
                                        <img src={mediaUrl(p.imageUrl) || PLACEHOLDER} alt={`${p.brand.name} ${p.name} parfümü`} />
                                    </button>
                                </div>
                            </td>
                        ))}
                    </tr>

                    <Row label="Marka / İsim" perfumes={perfumes} render={(p) => <Link href={perfumeHref(p.path, p.slug)} className="matrix-perfume-link"><strong>{p.brand.name}</strong> {p.name}</Link>} />
                    <Row label="Koku ailesi" perfumes={perfumes} render={(p) => p.fragranceFamily ?? "—"} />
                    <Row label="Cinsiyet" perfumes={perfumes} render={(p) => genderLabel(p.gender)} />
                    <Row label="Konsantrasyon" perfumes={perfumes} render={(p) => p.concentration ?? "—"} />
                    <Row label="Çıkış yılı" perfumes={perfumes} render={(p) => p.releaseYear?.toString() ?? "—"} />
                    <Row
                        label="Puan"
                        perfumes={perfumes}
                        render={(p) => (
                            <span className="matrix-score">
                                <Stars value={p.avgRating} size={15} showValue />
                                <small>{p.ratingCount.toLocaleString("tr-TR")} oy</small>
                            </span>
                        )}
                    />

                    <Row
                        label="Ana akorlar"
                        perfumes={perfumes}
                        render={(p) => (
                            <div className="matrix-chip-col">
                                {p.accords.slice(0, 4).map((a) => (
                                    <span key={a.slug} className="accord-chip">{a.name}</span>
                                ))}
                            </div>
                        )}
                    />

                    <Row label="Üst notalar" perfumes={perfumes} render={(p) => <NoteList notes={p.notes.top} />} />
                    <Row label="Orta notalar" perfumes={perfumes} render={(p) => <NoteList notes={p.notes.middle} />} />
                    <Row label="Alt notalar" perfumes={perfumes} render={(p) => <NoteList notes={p.notes.base} />} />
                    {perfumes.some((p) => p.notes.all.length > 0) && (
                        <Row
                            label="Notalar (piramitsiz)"
                            perfumes={perfumes}
                            render={(p) => <NoteList notes={p.notes.all} />}
                        />
                    )}

                    <Row
                        label="Kalıcılık puanı"
                        perfumes={perfumes}
                        render={(p) => <SingleVoteBarCell items={p.longevity} scaleOrder={LONGEVITY_SCALE_ORDER} totalSteps={5} />}
                    />
                    <Row
                        label="Yayılım puanı"
                        perfumes={perfumes}
                        render={(p) => <SingleVoteBarCell items={p.sillage} scaleOrder={SILLAGE_SCALE_ORDER} totalSteps={4} />}
                    />
                    <Row
                        label="Kime gider?"
                        perfumes={perfumes}
                        render={(p) => <SingleVoteBarCell items={p.genderVotes} scaleOrder={GENDER_SCALE_ORDER} totalSteps={5} />}
                    />
                    <Row
                        label="Fiyat / değer"
                        perfumes={perfumes}
                        render={(p) => <SingleVoteBarCell items={p.priceVotes} scaleOrder={PRICE_SCALE_ORDER} totalSteps={5} />}
                    />

                    <Row
                        label="Mevsim uyumu"
                        perfumes={perfumes}
                        render={(p) => <TopFacetCell items={p.seasons} />}
                    />

                    <Row
                        label="Gündüz / gece"
                        perfumes={perfumes}
                        render={(p) => <TopFacetCell items={p.timeOfDay} />}
                    />

                    <Row
                        label="Yaş grubu"
                        perfumes={perfumes}
                        render={(p) => <TopFacetCell items={p.ageGroups} />}
                    />
                </tbody>
            </table>
        </div>
    );
}

const LONGEVITY_SCALE_ORDER: Record<string, number> = {
    "cok-zayif": 1,
    "zayif": 2,
    "orta": 3,
    "uzun-sureli": 4,
    "cok-uzun-sureli": 5,
};

const SILLAGE_SCALE_ORDER: Record<string, number> = {
    "kisisel": 1,
    "yakin": 1,
    "orta": 2,
    "guclu": 3,
    "cok-guclu": 4,
};

const GENDER_SCALE_ORDER: Record<string, number> = {
    "kadin": 1,
    "daha-cok-kadin": 2,
    "unisex": 3,
    "daha-cok-erkek": 4,
    "erkek": 5,
};

const PRICE_SCALE_ORDER: Record<string, number> = {
    "cok-uygun": 1,
    "uygun": 2,
    "makul": 3,
    "pahali": 4,
    "cok-pahali": 5,
};

function SingleVoteBarCell({
    items,
    scaleOrder,
    totalSteps = 5,
}: {
    items?: VoteBar[];
    scaleOrder?: Record<string, number>;
    totalSteps?: number;
}) {
    if (!items || items.length === 0) return <span className="faint">—</span>;
    const totalVotes = items.reduce((sum, i) => sum + (i.votes || 0), 0);
    const hasAnyVotes = items.some((i) => (i.votes || 0) > 0 || (i.percent || 0) > 0);
    if (!hasAnyVotes) return <span className="faint">—</span>;

    const sorted = [...items].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const top = sorted[0];
    if (!top || (top.votes === 0 && top.percent === 0)) return <span className="faint">—</span>;

    const step =
        scaleOrder && scaleOrder[top.slug]
            ? scaleOrder[top.slug]
            : Math.max(1, Math.min(totalSteps, Math.round(((top.percent || 0) / 100) * totalSteps) || 1));

    const percent = Math.round((step / totalSteps) * 100);

    return (
        <div className="clean-bar-wrap">
            <span className="clean-bar-label">{top.name}</span>
            <div className="clean-bar-track">
                <span className="clean-bar-fill" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function TopFacetCell({ items }: { items: ScoredRef[] }) {
    if (!items || items.length === 0) return <span className="faint">—</span>;
    const hasVotes = items.some((i) => i.score > 0 || i.votes > 0);
    if (!hasVotes) return <span className="faint">—</span>;

    const top = [...items].sort((a, b) => b.score - a.score)[0];
    if (!top || top.score === 0) return <span className="faint">—</span>;

    const ico = FACET_ICONS[top.slug] ?? "";

    return (
        <span className="matrix-facet-text">
            {ico && <span className="facet-ico" aria-hidden="true">{ico}</span>}
            {top.name}
        </span>
    );
}

function Row({
    label, perfumes, render,
}: {
    label: string;
    perfumes: PerfumeDetail[];
    render: (p: PerfumeDetail) => React.ReactNode;
}) {
    return (
        <tr>
            <th className="row-label">{label}</th>
            {perfumes.map((p) => (
                <td key={p.slug}>{render(p)}</td>
            ))}
        </tr>
    );
}

function NoteList({ notes }: { notes: Note[] }) {
    if (!notes?.length) return <span className="faint">—</span>;
    return (
        <div className="matrix-chip-col">
            {notes.map((n, i) => (
                <span key={i} className="note-chip">
                    <span className="note-ico" aria-hidden="true">{noteIcon(n.name, n.category)}</span>
                    {n.name}
                </span>
            ))}
        </div>
    );
}

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

function AiComparisonAnalysis({ p1, p2 }: { p1: PerfumeDetail; p2: PerfumeDetail }) {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setAnalysis(null);

        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/compare/${p1.slug}-vs-${p2.slug}/ai-analysis`);
                if (res.ok) {
                    const data = await res.json();
                    if (active && data?.summary) {
                        setAnalysis(data.summary);
                    }
                }
            } catch {
                /* yoksay */
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [p1.slug, p2.slug]);

    if (!loading && !analysis) return null;

    const paragraphs = (analysis ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);

    return (
        <section className="compare-ai-section">
            <div className="compare-ai-head">
                <span className="compare-ai-badge">
                    <Icon name="sparkle" size={14} /> Yapay Zekâ Karşılaştırma Analizi
                </span>
                <span className="compare-ai-sub">
                    {p1.brand.name} {p1.name} & {p2.brand.name} {p2.name}
                </span>
            </div>
            {loading ? (
                <div className="compare-ai-loading">
                    <div className="spinner" />
                    <p>Yapay zekâ koku notalarını, mevsim uyumunu ve kullanım ortamını analiz ediyor…</p>
                </div>
            ) : (
                <div className="compare-ai-paragraphs">
                    {paragraphs.map((para, i) => {
                        const match = para.match(/^\*\*([^*]+)\*\*[:\s-]*([\s\S]*)$/);
                        if (match) {
                            return (
                                <p key={i} className="compare-ai-para">
                                    <strong className="compare-ai-heading">{match[1].trim()}</strong>
                                    <span>{match[2].trim()}</span>
                                </p>
                            );
                        }
                        return <p key={i} className="compare-ai-para">{para}</p>;
                    })}
                </div>
            )}
        </section>
    );
}

function ComparisonComments({ p1, p2 }: { p1: PerfumeDetail; p2: PerfumeDetail }) {
    const { token } = useAuth();
    const [comments, setComments] = useState<ComparisonComment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [preferred, setPreferred] = useState("");
    const [posting, setPosting] = useState(false);
    const [status, setStatus] = useState("");

    const endpoint = `${API_BASE}/api/compare/${p1.slug}-vs-${p2.slug}/comments`;

    const load = async () => {
        try {
            const res = await fetch(endpoint);
            if (res.ok) setComments(await res.json());
        } catch {
            /* yoksay */
        }
    };

    useEffect(() => {
        load();
    }, [endpoint]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setPosting(true);
        setStatus("");
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ content: commentText, preferredSlug: preferred || null }),
            });
            if (res.ok) {
                setCommentText("");
                setPreferred("");
                setStatus("Yorumunuz eklendi.");
                await load();
            } else {
                setStatus("Yorum eklenemedi.");
            }
        } catch {
            setStatus("Bağlantı hatası.");
        } finally {
            setPosting(false);
        }
    };

    const userComments = comments.filter((c) => !c.isAiSummary);

    return (
        <section className="block">
            <h2 className="block-title">Bu karşılaştırma hakkında ({userComments.length})</h2>

            <div className="comment-form-wrap">
                <LoginPrompt label="Bu karşılaştırma hakkında yorum yapmak için giriş yapın">
                    <form onSubmit={submit}>
                        <div className="form-group">
                            <label htmlFor="cmp-body">Yorumunuz</label>
                            <textarea
                                id="cmp-body"
                                className="textarea"
                                placeholder="İkisini karşılaştıran deneyiminizi paylaşın…"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Hangisini tercih ediyorsunuz?</label>
                            <div className="tag-row">
                                <PrefButton label={p1.name} slug={p1.slug} preferred={preferred} setPreferred={setPreferred} />
                                <PrefButton label={p2.name} slug={p2.slug} preferred={preferred} setPreferred={setPreferred} />
                            </div>
                        </div>
                        <button className="btn btn-primary" disabled={posting}>
                            <Icon name="send" size={14} /> Gönder
                        </button>
                        {status && <p className="form-note ok">{status}</p>}
                    </form>
                </LoginPrompt>
            </div>

            {userComments.length > 0 ? (
                userComments.map((c) => {
                    const pref =
                        c.preferredSlug === p1.slug ? p1.name : c.preferredSlug === p2.slug ? p2.name : null;
                    return (
                        <div key={c.id} className="comment">
                            <div className="comment-head">
                                <span className="comment-author">{c.authorName ?? "Kullanıcı"}</span>
                                <span className="comment-date">{formatDate(c.createdAt)}</span>
                            </div>
                            {pref && <span className="tag tag-choice">tercihi: {pref}</span>}
                            <p className="comment-body">{c.body}</p>
                        </div>
                    );
                })
            ) : (
                <p className="empty">Bu karşılaştırma için henüz yorum yok.</p>
            )}
        </section>
    );
}

function PrefButton({
    label, slug, preferred, setPreferred,
}: { label: string; slug: string; preferred: string; setPreferred: (s: string) => void }) {
    const on = preferred === slug;
    return (
        <button
            type="button"
            className={on ? "tag tag-family tag-choice" : "tag tag-choice"}
            onClick={() => setPreferred(on ? "" : slug)}
        >
            {label}
        </button>
    );
}

function PerfumePicker({
    label, onPick, disabled,
}: { label?: string; onPick: (s: Suggestion) => void; disabled?: boolean }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/search/autocomplete?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.perfumes ?? []);
                    setOpen(true);
                }
            } catch {
                /* yoksay */
            }
        }, 220);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    return (
        <div className="form-group" style={{ position: "relative", margin: 0 }} ref={boxRef}>
            {label && <label>{label}</label>}
            <div className="field">
                <Icon name="search" />
                <input
                    value={query}
                    disabled={disabled}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={disabled ? `En fazla ${MAX_COMPARE} parfüm` : "Listeye parfüm ekle…"}
                    aria-label="Listeye parfüm ekle"
                />
            </div>
            {open && results.length > 0 && (
                <div className="autocomplete">
                    {results.map((r) => (
                        <button
                            key={r.slug}
                            className="ac-item"
                            type="button"
                            onClick={() => { onPick(r); setQuery(""); setOpen(false); }}
                        >
                            {r.imageUrl && <img className="ac-thumb" src={mediaUrl(r.imageUrl)} alt={`${r.brandName} ${r.name}`} />}
                            <span>
                                <span className="ac-name">{r.name}</span>
                                <span className="ac-meta">{r.brandName}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
