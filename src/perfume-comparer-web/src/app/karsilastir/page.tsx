"use client";

import { useState, useEffect, useRef, useMemo, Suspense, FormEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Stars from "@/components/Stars";
import LoginPrompt from "@/components/LoginPrompt";
import { PageBreadcrumb } from "@/components/Breadcrumb";
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

interface PerfumeDetail {
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
    accords: Accord[];
    notes: { top: Note[]; middle: Note[]; base: Note[]; all: Note[] };
    seasons: ScoredRef[];
    timeOfDay: ScoredRef[];
    longevity: VoteBar[];
    sillage: VoteBar[];
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

export default function ComparePage() {
    return (
        <Suspense fallback={<div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>}>
            <CompareInner />
        </Suspense>
    );
}

function CompareInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { remove } = useCompare();

    // Eski ?p1=&p2= linkleri de items ile aynı tabloyu açar.
    const slugs = useMemo(() => {
        const items = searchParams.get("items");
        if (items) return items.split(",").filter(Boolean).slice(0, MAX_COMPARE);
        const pair = [searchParams.get("p1"), searchParams.get("p2")].filter(Boolean) as string[];
        return pair;
    }, [searchParams]);

    const [perfumes, setPerfumes] = useState<PerfumeDetail[]>([]);
    const [loading, setLoading] = useState(slugs.length > 0);

    useEffect(() => {
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
            <PageBreadcrumb trail={[{ label: "Karşılaştırma" }]} />

            <header style={{ marginBottom: "1.25rem" }}>
                <span className="eyebrow">Yan yana</span>
                <h1 className="page-title">Koku karşılaştırma</h1>
                <p className="section-desc">
                    En fazla {MAX_COMPARE} parfümü notaları, puanı, mevsim ve yaş uyumuyla tek tabloda inceleyin.
                </p>
            </header>

            <div className="compare-picker">
                <PerfumePicker
                    label={slugs.length === 0 ? "Parfüm ekle" : "Listeye parfüm ekle"}
                    disabled={slugs.length >= MAX_COMPARE}
                    onPick={(s) => add(s.slug)}
                />
            </div>

            {loading ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : perfumes.length === 0 ? (
                <div className="state">
                    <h2>Karşılaştırma listeniz boş</h2>
                    <p>Yukarıdan parfüm arayın ya da parfüm kartlarındaki “Karşılaştır” ile ekleyin.</p>
                    <Link href="/ara" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                        <Icon name="search" size={14} /> Parfüm ara
                    </Link>
                </div>
            ) : (
                <>
                    <CompareMatrix perfumes={perfumes} onRemove={drop} />
                    {perfumes.length === 2 && (
                        <ComparisonComments p1={perfumes[0]} p2={perfumes[1]} />
                    )}
                </>
            )}
        </>
    );
}

/** Tekil parfüm sayfasındaki verilerin tamamını satır satır gösteren tablo. */
function CompareMatrix({ perfumes, onRemove }: { perfumes: PerfumeDetail[]; onRemove: (slug: string) => void }) {
    const seasonSlugs = dedupe(perfumes.flatMap((p) => p.seasons.map((s) => s.slug)));
    // Yaş grubu tamamen site kullanıcılarından geliyor; kimse bildirmediyse satırı hiç açma.
    const ageSlugs = perfumes.some((p) => p.usageCount > 0)
        ? dedupe(perfumes.flatMap((p) => p.ageGroups.map((a) => a.slug)))
        : [];

    const seasonName = (slug: string) =>
        perfumes.flatMap((p) => p.seasons).find((s) => s.slug === slug)?.name ?? slug;
    const ageName = (slug: string) =>
        perfumes.flatMap((p) => p.ageGroups).find((a) => a.slug === slug)?.name ?? slug;

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
                                <img src={mediaUrl(p.imageUrl) || PLACEHOLDER} alt="" />
                                <span className="card-brand">{p.brand.name}</span>
                                <br />
                                <Link href={perfumeHref(p.path, p.slug)} className="card-title" style={{ fontSize: "0.95rem" }}>
                                    {p.name}
                                </Link>
                            </td>
                        ))}
                    </tr>

                    <Row label="Marka" perfumes={perfumes} render={(p) => p.brand.name} />
                    <Row label="Koku ailesi" perfumes={perfumes} render={(p) => p.fragranceFamily ?? "—"} />
                    <Row label="Cinsiyet" perfumes={perfumes} render={(p) => genderLabel(p.gender)} />
                    <Row label="Konsantrasyon" perfumes={perfumes} render={(p) => p.concentration ?? "—"} />
                    <Row label="Çıkış yılı" perfumes={perfumes} render={(p) => p.releaseYear?.toString() ?? "—"} />
                    <Row
                        label="Puan"
                        perfumes={perfumes}
                        render={(p) => <Stars value={p.avgRating} size={16} showValue />}
                    />
                    <Row label="Değerlendirme" perfumes={perfumes} render={(p) => `${p.ratingCount.toLocaleString("tr-TR")} oy`} />

                    <Row
                        label="Ana akorlar"
                        perfumes={perfumes}
                        render={(p) => (
                            <div className="tag-row">
                                {p.accords.slice(0, 4).map((a) => (
                                    <span key={a.slug} className="accord-chip">{a.name}</span>
                                ))}
                            </div>
                        )}
                    />

                    <Row label="Kalıcılık" perfumes={perfumes} render={(p) => topVote(p.longevity)} />
                    <Row label="Yayılım" perfumes={perfumes} render={(p) => topVote(p.sillage)} />

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

                    {seasonSlugs.map((slug) => (
                        <Row
                            key={slug}
                            label={seasonName(slug)}
                            perfumes={perfumes}
                            render={(p) => {
                                const s = p.seasons.find((x) => x.slug === slug);
                                return s ? <Meter score={s.score} /> : "—";
                            }}
                        />
                    ))}

                    {ageSlugs.map((slug) => (
                        <Row
                            key={slug}
                            label={ageName(slug)}
                            perfumes={perfumes}
                            render={(p) => {
                                const a = p.ageGroups.find((x) => x.slug === slug);
                                return a ? <Meter score={a.score} /> : "—";
                            }}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Bir oylamada en çok oy alan seçenek; hiç oy yoksa tire. */
function topVote(items: VoteBar[]): string {
    if (!items?.length) return "—";
    const top = [...items].sort((a, b) => b.votes - a.votes)[0];
    return top.votes > 0 ? `${top.name} (%${top.percent})` : "—";
}

function dedupe(values: string[]): string[] {
    return values.filter((v, i) => values.indexOf(v) === i);
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
        <div className="tag-row">
            {notes.map((n, i) => (
                <span key={i} className="note-chip">
                    <span className="note-ico" aria-hidden="true">{noteIcon(n.name, n.category)}</span>
                    {n.name}
                </span>
            ))}
        </div>
    );
}

function Meter({ score }: { score: number }) {
    return (
        <span className="meter">
            <span className="bar-track">
                <span className="bar-fill" style={{ width: `${score}%` }} />
            </span>
            <span className="bar-val">%{score}</span>
        </span>
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
            /* yorumlar kritik değil */
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const ai = comments.find((c) => c.isAiSummary) ?? null;
    const userComments = comments.filter((c) => !c.isAiSummary);

    return (
        <section className="block">
            <h2 className="block-title">Bu karşılaştırma hakkında ({userComments.length})</h2>

            {ai && (
                <div className="ai-summary">
                    <div className="ai-summary-head">
                        <Icon name="sparkle" size={14} />
                        <span>Yorumların yapay zekâ özeti</span>
                        <span className="comment-date">{formatDate(ai.updatedAt || ai.createdAt)}</span>
                    </div>
                    <p className="ai-summary-body">{ai.body}</p>
                </div>
            )}

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
}: { label: string; onPick: (s: Suggestion) => void; disabled?: boolean }) {
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
            <label>{label}</label>
            <div className="field">
                <Icon name="search" />
                <input
                    value={query}
                    disabled={disabled}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={disabled ? `En fazla ${MAX_COMPARE} parfüm` : "Parfüm ara…"}
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
                            {r.imageUrl && <img className="ac-thumb" src={mediaUrl(r.imageUrl)} alt="" />}
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
