"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminJson, formatDateTime } from "@/lib/adminSession";
import { blogHref, compareHref, perfumeHref } from "@/lib/urls";

interface Count { total: number; period: number }
interface Rank { title: string; subtitle?: string | null; path?: string | null; value: number }
interface Choice { label: string; count: number }
interface Daily {
    date: string;
    newUsers: number;
    comments: number;
    recommendations: number;
    ratings: number;
    votes: number;
    favorites: number;
}

interface Analytics {
    days: number;
    generatedAt: string;
    summary: {
        visitors: { last24h: number; last7d: number; last30d: number; allTime: number; perfumePageViews: number };
        users: Count;
        perfumeComments: Count;
        comparisonComments: Count;
        recommendations: Count;
        recommendationUsers: number;
        ratings: Count;
        favorites: Count;
        comparisonVotes: Count;
        usages: Count;
        photos: Count;
        blogViews: number;
        aiSummaries: number;
        blogsByStatus: Record<string, number>;
    };
    daily: Daily[];
    topPerfumes: Rank[];
    topPerfumesAllTime: Rank[];
    topBlogs: Rank[];
    mostCommented: Rank[];
    mostRecommended: Rank[];
    mostFavorited: Rank[];
    topComparisons: Rank[];
    advisor: { gender: Choice[]; occasion: Choice[]; season: Choice[] };
}

const PERIODS = [7, 30, 90, 365];

const METRICS: { key: keyof Omit<Daily, "date">; label: string }[] = [
    { key: "comments", label: "Yorum" },
    { key: "recommendations", label: "Parfüm önerisi" },
    { key: "newUsers", label: "Yeni üye" },
    { key: "ratings", label: "Puan" },
    { key: "votes", label: "Karşılaştırma oyu" },
    { key: "favorites", label: "Favori" },
];

const fmt = (n: number) => n.toLocaleString("tr-TR");

/** Genel bakış: sayaçlar, günlük grafik ve "en çok" listeleri. */
export default function AdminOverview() {
    const [days, setDays] = useState(30);
    const [data, setData] = useState<Analytics | null>(null);
    const [failed, setFailed] = useState(false);
    const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("comments");

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            const result = await adminJson<Analytics>(`/api/admin/analytics?days=${days}`, controller.signal);
            if (controller.signal.aborted) return;
            setData(result);
            setFailed(result === null);
        })();
        return () => controller.abort();
    }, [days]);

    if (failed) return <p className="form-note err">Analitik yüklenemedi.</p>;
    if (!data) return <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>;

    const s = data.summary;
    const v = s.visitors;
    const periodLabel = days === 365 ? "son 1 yıl" : `son ${days} gün`;

    const kpis: { label: string; value: number; sub?: string }[] = [
        { label: "Ziyaretçi (24 saat)", value: v.last24h },
        { label: "Ziyaretçi (7 gün)", value: v.last7d },
        { label: "Ziyaretçi (30 gün)", value: v.last30d },
        { label: "Ziyaretçi (toplam)", value: v.allTime, sub: `${fmt(v.perfumePageViews)} parfüm görüntüleme` },
        { label: "Üye", value: s.users.total, sub: `+${fmt(s.users.period)} ${periodLabel}` },
        { label: "Parfüm yorumu", value: s.perfumeComments.total, sub: `+${fmt(s.perfumeComments.period)} ${periodLabel}` },
        { label: "Karşılaştırma yorumu", value: s.comparisonComments.total, sub: `+${fmt(s.comparisonComments.period)} ${periodLabel}` },
        { label: "Bana parfüm öner", value: s.recommendations.total, sub: `+${fmt(s.recommendations.period)} ${periodLabel}, ${fmt(s.recommendationUsers)} kişi` },
        { label: "Site puanı", value: s.ratings.total, sub: `+${fmt(s.ratings.period)} ${periodLabel}` },
        { label: "Favori", value: s.favorites.total, sub: `+${fmt(s.favorites.period)} ${periodLabel}` },
        { label: "Karşılaştırma oyu", value: s.comparisonVotes.total, sub: `+${fmt(s.comparisonVotes.period)} ${periodLabel}` },
        { label: "\"Kullanıyorum\"", value: s.usages.total, sub: `+${fmt(s.usages.period)} ${periodLabel}` },
        { label: "Kullanıcı fotoğrafı", value: s.photos.total, sub: `+${fmt(s.photos.period)} ${periodLabel}` },
        { label: "Blog okunma", value: s.blogViews },
        { label: "Yayındaki yazı", value: s.blogsByStatus.Published ?? 0, sub: `${fmt(s.blogsByStatus.Pending ?? 0)} onay bekliyor` },
        { label: "AI özeti", value: s.aiSummaries },
    ];

    const series = data.daily.map((d) => ({ date: d.date, value: d[metric] }));
    const max = Math.max(1, ...series.map((p) => p.value));
    const sum = series.reduce((acc, p) => acc + p.value, 0);

    return (
        <>
            <div className="admin-toolbar">
                <span className="muted">Dönem:</span>
                {PERIODS.map((p) => (
                    <button
                        key={p}
                        type="button"
                        className={`chip${p === days ? " chip-active" : ""}`}
                        onClick={() => setDays(p)}
                    >
                        {p === 365 ? "1 yıl" : `${p} gün`}
                    </button>
                ))}
                <span className="faint admin-toolbar-end">Güncellendi: {formatDateTime(data.generatedAt)}</span>
            </div>

            <dl className="admin-kpis">
                {kpis.map((k) => (
                    <div key={k.label} className="admin-kpi">
                        <dt>{k.label}</dt>
                        <dd>{fmt(k.value)}</dd>
                        {k.sub && <dd className="admin-kpi-sub">{k.sub}</dd>}
                    </div>
                ))}
            </dl>
            <p className="faint admin-note">
                Ziyaretçi: parfüm sayfası açan tekil IP adresi. Anasayfa, arama ve blog ziyaretleri bu sayıya girmez;
                sitede ayrı bir sayfa görüntüleme kaydı yoktur.
            </p>

            <section className="block">
                <h2 className="block-title">Günlük etkileşim</h2>
                <div className="admin-toolbar">
                    {METRICS.map((m) => (
                        <button
                            key={m.key}
                            type="button"
                            className={`chip${m.key === metric ? " chip-active" : ""}`}
                            onClick={() => setMetric(m.key)}
                        >
                            {m.label}
                        </button>
                    ))}
                    <span className="muted admin-toolbar-end">{periodLabel}: {fmt(sum)}</span>
                </div>
                <div className="admin-chart" role="img" aria-label={`${METRICS.find((m) => m.key === metric)?.label} günlük grafiği`}>
                    {series.map((p) => (
                        <span
                            key={p.date}
                            className="admin-chart-col"
                            title={`${new Date(p.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}: ${p.value}`}
                        >
                            <span className="admin-chart-bar" style={{ height: `${(p.value / max) * 100}%` }} />
                        </span>
                    ))}
                </div>
                <div className="admin-chart-axis faint">
                    <span>{series[0]?.date}</span>
                    <span>en yüksek: {fmt(max)}</span>
                    <span>{series[series.length - 1]?.date}</span>
                </div>
            </section>

            <div className="admin-grid">
                <RankTable title={`En çok ziyaret edilen parfümler (${periodLabel})`} unit="ziyaretçi" rows={data.topPerfumes} kind="perfume" />
                <RankTable title="En çok ziyaret edilen parfümler (tüm zamanlar)" unit="ziyaretçi" rows={data.topPerfumesAllTime} kind="perfume" />
                <RankTable title="En çok okunan blog yazıları" unit="okunma" rows={data.topBlogs} kind="blog" />
                <RankTable title={`En çok yorum alan parfümler (${periodLabel})`} unit="yorum" rows={data.mostCommented} kind="perfume" />
                <RankTable title={`En çok önerilen parfümler (${periodLabel})`} unit="öneri" rows={data.mostRecommended} kind="perfume" />
                <RankTable title={`En çok favorilenen parfümler (${periodLabel})`} unit="favori" rows={data.mostFavorited} kind="perfume" />
                <RankTable title={`En çok konuşulan karşılaştırmalar (${periodLabel})`} unit="etkileşim" rows={data.topComparisons} kind="compare" />
                <section className="block">
                    <h2 className="block-title">Danışman formunda seçilenler ({periodLabel})</h2>
                    <ChoiceList label="Cinsiyet" items={data.advisor.gender} />
                    <ChoiceList label="Ortam" items={data.advisor.occasion} />
                    <ChoiceList label="Mevsim" items={data.advisor.season} />
                </section>
            </div>
        </>
    );
}

function rowHref(kind: "perfume" | "blog" | "compare", path?: string | null): string | null {
    if (!path) return null;
    if (kind === "blog") return blogHref(path);
    if (kind === "compare") {
        const [a, b] = path.split(",");
        return compareHref(a, b);
    }
    return perfumeHref(path);
}

function RankTable({ title, unit, rows, kind }: { title: string; unit: string; rows: Rank[]; kind: "perfume" | "blog" | "compare" }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <section className="block">
            <h2 className="block-title">{title}</h2>
            {rows.length === 0 ? (
                <p className="faint">Bu dönemde kayıt yok.</p>
            ) : (
                <ol className="admin-rank">
                    {rows.map((r, i) => {
                        const href = rowHref(kind, r.path);
                        return (
                            <li key={`${r.path}-${i}`}>
                                <span className="admin-rank-num">{i + 1}</span>
                                <span className="admin-rank-name">
                                    {href ? (
                                        <Link href={href} target="_blank">{kind === "perfume" && r.subtitle ? `${r.subtitle} ${r.title}` : r.title}</Link>
                                    ) : r.title}
                                    {kind === "compare" && r.subtitle && <small className="faint">{r.subtitle}</small>}
                                    <span className="bar-track"><span className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></span>
                                </span>
                                <span className="admin-rank-val" title={unit}>{fmt(r.value)}</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}

function ChoiceList({ label, items }: { label: string; items: Choice[] }) {
    return (
        <p className="admin-choices">
            <strong>{label}:</strong>{" "}
            {items.length === 0 ? <span className="faint">—</span> : items.map((c) => (
                <span key={c.label} className="badge badge-muted">{c.label} · {c.count}</span>
            ))}
        </p>
    );
}
