"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Icon from "@/components/Icon";
import Breadcrumb from "@/components/Breadcrumb";
import { PerfumeCard, type PerfumeCardData } from "@/components/PerfumeCard";
import { API_BASE, mediaUrl } from "@/lib/urls";

interface Facet {
    name: string;
    slug: string;
    count: number;
}

interface BrandDetail {
    name: string;
    slug: string;
    country?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    mainActivity?: string | null;
    websiteUrl?: string | null;
    parentCompany?: string | null;
    perfumeCount: number;
    firstYear?: number | null;
    lastYear?: number | null;
    avgRating: number;
    genders: Facet[];
    concentrations: Facet[];
    families: Facet[];
    accords: Facet[];
}

const PAGE_SIZE = 24;

const SORTS = [
    { v: "", label: "Öne çıkanlar" },
    { v: "rating", label: "En yüksek puan" },
    { v: "newest", label: "En yeni" },
    { v: "oldest", label: "En eski" },
    { v: "name", label: "İsim (A-Z)" },
];

/** Hızlı filtre satırındaki bir grup: aynı anda tek seçim yapılır. */
type FilterKey = "gender" | "concentration" | "family" | "accord";

export default function BrandPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [brand, setBrand] = useState<BrandDetail | null>(null);
    const [brandLoading, setBrandLoading] = useState(true);

    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
    const [sort, setSort] = useState("");

    const [perfumes, setPerfumes] = useState<PerfumeCardData[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [listLoading, setListLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // --- marka bilgisi
    useEffect(() => {
        if (!slug) return;
        (async () => {
            setBrandLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/brands/${slug}`);
                setBrand(res.ok ? await res.json() : null);
            } catch {
                setBrand(null);
            } finally {
                setBrandLoading(false);
            }
        })();
    }, [slug]);

    // --- arama kutusu: her tuşta istek atmasın
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const buildUrl = useCallback(
        (targetPage: number) => {
            const p = new URLSearchParams({ brand: slug, page: String(targetPage), pageSize: String(PAGE_SIZE) });
            if (debouncedQuery) p.set("q", debouncedQuery);
            if (sort) p.set("sort", sort);
            for (const [key, value] of Object.entries(filters)) {
                if (value) p.set(key, value);
            }
            return `${API_BASE}/api/perfumes?${p.toString()}`;
        },
        [slug, debouncedQuery, sort, filters],
    );

    // --- filtre/arama değişince listeyi baştan kur
    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        setListLoading(true);
        (async () => {
            try {
                const res = await fetch(buildUrl(1));
                if (!res.ok) throw new Error("liste");
                const data = await res.json();
                if (cancelled) return;
                setPerfumes(data.items ?? []);
                setTotal(data.totalCount ?? 0);
                setPage(1);
            } catch {
                if (!cancelled) {
                    setPerfumes([]);
                    setTotal(0);
                }
            } finally {
                if (!cancelled) setListLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug, buildUrl]);

    const hasMore = perfumes.length < total;

    const loadMore = useCallback(async () => {
        if (loadingMore || listLoading || !hasMore) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            const res = await fetch(buildUrl(next));
            if (res.ok) {
                const data = await res.json();
                setPerfumes((prev) => [...prev, ...(data.items ?? [])]);
                setPage(next);
            }
        } catch {
            /* sonsuz kaydırma kritik değil; "Daha fazla" butonu kalıyor */
        } finally {
            setLoadingMore(false);
        }
    }, [buildUrl, hasMore, listLoading, loadingMore, page]);

    // --- sonsuz kaydırma: liste sonuna gelince sonraki sayfa
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: "400px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    const toggleFilter = (key: FilterKey, value: string) =>
        setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));

    const activeFilters = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => {
        setFilters({});
        setQuery("");
    };

    if (brandLoading) {
        return (
            <div className="state">
                <div className="spinner" />
                <p>Yükleniyor…</p>
            </div>
        );
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
                        <span className="brand-logo-fallback">{brand.name.charAt(0)}</span>
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

            <section className="brand-tools">
                <div className="field">
                    <Icon name="search" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`${brand.name} parfümlerinde ara…`}
                        aria-label={`${brand.name} parfümlerinde ara`}
                    />
                    {query && (
                        <button onClick={() => setQuery("")} aria-label="Temizle">
                            <Icon name="close" size={14} />
                        </button>
                    )}
                </div>

                <div className="quick-filters">
                    <FilterChips
                        items={brand.genders}
                        active={filters.gender}
                        onPick={(value) => toggleFilter("gender", value)}
                    />
                    <FilterChips
                        items={brand.concentrations}
                        active={filters.concentration}
                        onPick={(value) => toggleFilter("concentration", value)}
                    />
                    <FilterChips
                        items={brand.families.slice(0, 6)}
                        active={filters.family}
                        onPick={(value) => toggleFilter("family", value)}
                    />
                    <FilterChips
                        items={brand.accords.slice(0, 8)}
                        active={filters.accord}
                        onPick={(value) => toggleFilter("accord", value)}
                    />
                    {(activeFilters > 0 || query) && (
                        <button className="chip chip-clear" onClick={clearFilters}>
                            <Icon name="close" size={12} /> Filtreleri temizle
                        </button>
                    )}
                </div>

                <div className="search-toolbar">
                    <span className="muted">{listLoading ? "Yükleniyor…" : `${total} parfüm`}</span>
                    <label className="sort-select">
                        <span className="muted">Sırala:</span>
                        <select value={sort} onChange={(e) => setSort(e.target.value)}>
                            {SORTS.map((s) => (
                                <option key={s.v} value={s.v}>{s.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </section>

            {listLoading && perfumes.length === 0 ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : perfumes.length > 0 ? (
                <>
                    <div className="grid-cards">
                        {perfumes.map((p) => (
                            <PerfumeCard key={p.slug} perfume={p} />
                        ))}
                    </div>

                    <div ref={sentinelRef} className="load-more">
                        {hasMore ? (
                            <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                                {loadingMore ? "Yükleniyor…" : "Daha fazla göster"}
                            </button>
                        ) : (
                            <span className="muted">Tüm parfümler listelendi.</span>
                        )}
                    </div>
                </>
            ) : (
                <p className="empty">Bu filtrelere uyan parfüm bulunamadı. Filtreleri gevşetmeyi deneyin.</p>
            )}
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

function FilterChips({
    items,
    active,
    onPick,
}: {
    items: Facet[];
    active?: string;
    onPick: (slug: string) => void;
}) {
    if (items.length === 0) return null;
    return (
        <div className="quick-filter-row">
            {items.map((item) => (
                <button
                    key={item.slug}
                    className={`chip ${active === item.slug ? "chip-active" : ""}`}
                    onClick={() => onPick(item.slug)}
                >
                    {item.name} <span className="chip-count">{item.count}</span>
                </button>
            ))}
        </div>
    );
}
