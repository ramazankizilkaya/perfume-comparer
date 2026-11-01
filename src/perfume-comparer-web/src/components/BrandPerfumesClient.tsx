"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import { PerfumeCard, type PerfumeCardData } from "./PerfumeCard";
import { API_BASE } from "@/lib/urls";

export interface Facet {
    name: string;
    slug: string;
    count: number;
}

export interface BrandDetail {
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

type FilterKey = "gender" | "concentration" | "family" | "accord";

export default function BrandPerfumesClient({
    slug,
    brand,
    initialPerfumes,
    initialTotal,
    currentPage = 1,
    pagination,
}: {
    slug: string;
    brand: BrandDetail;
    initialPerfumes: PerfumeCardData[];
    initialTotal: number;
    currentPage?: number;
    pagination?: React.ReactNode;
}) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
    const [sort, setSort] = useState("");

    const [perfumes, setPerfumes] = useState<PerfumeCardData[]>(initialPerfumes);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(currentPage);
    const [listLoading, setListLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    // Sonsuz kaydırma bir kez hata verince otomatik yükleme durur; kullanıcı "Tekrar dene" der.
    const [loadError, setLoadError] = useState(false);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const toolsRef = useRef<HTMLElement | null>(null);
    const isInitialMount = useRef(true);

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

    useEffect(() => {
        // İlk yüklemede sunucudan gelen initialPerfumes kullanılır, tekrar istek atılmaz.
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (toolsRef.current) {
            const top = toolsRef.current.getBoundingClientRect().top + window.scrollY;
            if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
        }

        const controller = new AbortController();
        (async () => {
            setListLoading(true);
            setLoadError(false);
            try {
                const res = await fetch(buildUrl(1), { signal: controller.signal });
                if (!res.ok) throw new Error("liste");
                const data = await res.json();
                if (controller.signal.aborted) return;
                setPerfumes(data.items ?? []);
                setTotal(data.totalCount ?? 0);
                setPage(1);
            } catch {
                if (!controller.signal.aborted) {
                    setPerfumes([]);
                    setTotal(0);
                }
            } finally {
                if (!controller.signal.aborted) setListLoading(false);
            }
        })();
        return () => controller.abort();
    }, [slug, buildUrl]);

    // Önceki sayfalar da sayılır: ?sayfa=13'te 24 kart varken total 302 ise daha fazla yoktur.
    const hasMore = page * PAGE_SIZE < total;

    const loadMore = useCallback(async () => {
        if (loadingMore || listLoading || !hasMore) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            const res = await fetch(buildUrl(next));
            if (!res.ok) throw new Error("liste");
            const data = await res.json();
            const items: PerfumeCardData[] = data.items ?? [];
            if (items.length === 0) {
                // Boş sayfa: liste bitmiş sayılır, tekrar istek atılmaz.
                setTotal((prev) => Math.min(prev, page * PAGE_SIZE));
                return;
            }
            setPerfumes((prev) => [...prev, ...items]);
            setPage(next);
            setLoadError(false);
        } catch {
            setLoadError(true);
        } finally {
            setLoadingMore(false);
        }
    }, [buildUrl, hasMore, listLoading, loadingMore, page]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore || loadError) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: "400px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadError, loadMore]);

    const toggleFilter = (key: FilterKey, value: string) =>
        setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));

    const activeFilters = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => {
        setFilters({});
        setQuery("");
    };

    return (
        <>
            <section className="brand-tools" ref={toolsRef}>
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
                        title="Cinsiyet"
                        items={brand.genders}
                        active={filters.gender}
                        onPick={(value) => toggleFilter("gender", value)}
                    />
                    <FilterChips
                        title="Konsantrasyon"
                        items={brand.concentrations}
                        active={filters.concentration}
                        onPick={(value) => toggleFilter("concentration", value)}
                    />
                    <FilterChips
                        title="Koku ailesi"
                        items={brand.families.slice(0, 6)}
                        active={filters.family}
                        onPick={(value) => toggleFilter("family", value)}
                    />
                    <FilterChips
                        title="Akorlar"
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
                        {hasMore && loadError ? (
                            <>
                                <span className="form-note err">Liste yüklenemedi.</span>{" "}
                                <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? "Yükleniyor…" : "Tekrar dene"}
                                </button>
                            </>
                        ) : hasMore ? (
                            <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                                {loadingMore ? "Yükleniyor…" : "Daha fazla göster"}
                            </button>
                        ) : (
                            <span className="muted">Tüm parfümler listelendi.</span>
                        )}
                    </div>

                    {activeFilters === 0 && !query && pagination}
                </>
            ) : (
                <p className="empty">Bu filtrelere uyan parfüm bulunamadı. Filtreleri gevşetmeyi deneyin.</p>
            )}
        </>
    );
}

function FilterChips({
    title,
    items,
    active,
    onPick,
}: {
    /** Satırın ne olduğunu söyleyen kısa başlık ("Koku ailesi", "Akorlar"); aynı adlı çipler yan yana karışmasın. */
    title: string;
    items: Facet[];
    active?: string;
    onPick: (slug: string) => void;
}) {
    if (!items || items.length === 0) return null;
    return (
        <div className="quick-filter-row" role="group" aria-label={title}>
            <span className="quick-filter-row-label">{title}</span>
            <div className="quick-filter-row-chips">
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
        </div>
    );
}
