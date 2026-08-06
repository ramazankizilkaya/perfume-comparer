"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { PerfumeCard, type PerfumeCardData } from "@/components/PerfumeCard";
import { API_BASE } from "@/lib/urls";

interface Ref {
    id?: number;
    name: string;
    slug: string;
}

interface Meta {
    brands: Ref[];
    concentrations: Ref[];
    fragranceFamilies: Ref[];
    accords: Ref[];
    notes: { name: string; slug: string; category?: string }[];
}

const GENDERS = [
    { label: "Erkek", slug: "erkek" },
    { label: "Kadın", slug: "kadin" },
    { label: "Unisex", slug: "unisex" },
];

const SORTS = [
    { v: "", label: "Öne çıkanlar" },
    { v: "rating", label: "En yüksek puan" },
    { v: "newest", label: "En yeni" },
    { v: "oldest", label: "En eski" },
    { v: "name", label: "İsim (A-Z)" },
];

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>}>
            <SearchInner />
        </Suspense>
    );
}

function SearchInner() {
    const sp = useSearchParams();
    const router = useRouter();

    const initList = (k: string) => (sp.get(k) ? sp.get(k)!.split(",").filter(Boolean) : []);
    const [q, setQ] = useState(sp.get("q") ?? "");
    const [gender, setGender] = useState<string[]>(initList("gender"));
    const [family, setFamily] = useState<string[]>(initList("family"));
    const [concentration, setConcentration] = useState<string[]>(initList("concentration"));
    const [brand, setBrand] = useState<string[]>(initList("brand"));
    const [accord, setAccord] = useState<string[]>(initList("accord"));
    const [note, setNote] = useState<string[]>(initList("note"));
    const [sort, setSort] = useState(sp.get("sort") ?? "");

    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const isFirstSearch = useRef(true);

    const [meta, setMeta] = useState<Meta | null>(null);
    const [results, setResults] = useState<PerfumeCardData[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/meta/filters`);
                if (r.ok) setMeta(await r.json());
            } catch {
                /* meta olmadan da metin araması çalışır */
            }
        })();
    }, []);

    const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
        set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

    useEffect(() => {
        // Sonuçlar değişiyor: kullanıcı listenin ortasındaysa araç çubuğuna geri
        // getir. İlk yüklemede (adresten gelen filtrelerle) karışma.
        if (isFirstSearch.current) {
            isFirstSearch.current = false;
        } else if (toolbarRef.current) {
            const top = toolbarRef.current.getBoundingClientRect().top + window.scrollY;
            if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
        }

        const t = setTimeout(async () => {
            setLoading(true);
            const p = new URLSearchParams();
            if (q.trim()) p.set("q", q.trim());
            if (gender.length) p.set("gender", gender.join(","));
            if (family.length) p.set("family", family.join(","));
            if (concentration.length) p.set("concentration", concentration.join(","));
            if (brand.length) p.set("brand", brand.join(","));
            if (accord.length) p.set("accord", accord.join(","));
            if (note.length) p.set("note", note.join(","));
            if (sort) p.set("sort", sort);
            p.set("pageSize", "48");
            try {
                const r = await fetch(`${API_BASE}/api/perfumes?${p.toString()}`);
                if (r.ok) {
                    const d = await r.json();
                    setResults(d.items ?? []);
                    setTotal(d.totalCount ?? d.items?.length ?? 0);
                }
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
            const url = new URLSearchParams(p);
            url.delete("pageSize");
            router.replace(`/ara${url.toString() ? "?" + url.toString() : ""}`, { scroll: false });
        }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, gender, family, concentration, brand, accord, note, sort]);

    const activeCount =
        gender.length + family.length + concentration.length + brand.length +
        accord.length + note.length + (q.trim() ? 1 : 0);

    const clearAll = () => {
        setQ(""); setGender([]); setFamily([]); setConcentration([]);
        setBrand([]); setAccord([]); setNote([]); setSort("");
    };

    // Tek bir cinsiyet seçiliyse kırıntıda görünsün (erkek/kadın sayfaları aynı derinlikte olsun).
    const genderCrumb = gender.length === 1
        ? GENDERS.find((g) => g.slug === gender[0])?.label
        : undefined;

    return (
        <>
            <PageBreadcrumb
                trail={[
                    { label: "Parfüm ara", href: "/ara" },
                    ...(genderCrumb ? [{ label: genderCrumb }] : []),
                ]}
            />

            <header style={{ marginBottom: "1rem" }}>
                <span className="eyebrow">Detaylı arama</span>
                <h1 className="page-title">Parfüm ara ve filtrele</h1>
            </header>

            <div className="field" style={{ marginBottom: "1.25rem" }}>
                <Icon name="search" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Parfüm veya marka ara… (ör. dior sauvage)"
                    aria-label="Ara"
                />
                {q && (
                    <button onClick={() => setQ("")} aria-label="Temizle">
                        <Icon name="close" size={14} />
                    </button>
                )}
            </div>

            <div className="search-layout">
                <aside className={`filter-panel ${filtersOpen ? "open" : ""}`}>
                    <div className="filter-head">
                        <span className="filter-head-title">
                            <Icon name="filter" size={15} /> Filtreler
                            {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
                        </span>
                        {activeCount > 0 && <button className="link-more" onClick={clearAll}>Temizle</button>}
                    </div>

                    <FilterGroup title="Cinsiyet">
                        {GENDERS.map((g) => (
                            <Check key={g.slug} label={g.label} checked={gender.includes(g.slug)} onChange={() => toggle(gender, setGender, g.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup title="Koku ailesi">
                        {(meta?.fragranceFamilies ?? []).map((f) => (
                            <Check key={f.slug} label={f.name} checked={family.includes(f.slug)} onChange={() => toggle(family, setFamily, f.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup title="Konsantrasyon">
                        {(meta?.concentrations ?? []).map((c) => (
                            <Check key={c.slug} label={c.name} checked={concentration.includes(c.slug)} onChange={() => toggle(concentration, setConcentration, c.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup title="Ana akorlar" scroll>
                        {(meta?.accords ?? []).map((a) => (
                            <Check key={a.slug} label={a.name} checked={accord.includes(a.slug)} onChange={() => toggle(accord, setAccord, a.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup title="Notalar" scroll>
                        {(meta?.notes ?? []).map((n) => (
                            <Check key={n.slug} label={n.name} checked={note.includes(n.slug)} onChange={() => toggle(note, setNote, n.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup title="Marka" scroll>
                        {(meta?.brands ?? []).map((b) => (
                            <Check key={b.slug} label={b.name} checked={brand.includes(b.slug)} onChange={() => toggle(brand, setBrand, b.slug)} />
                        ))}
                    </FilterGroup>
                </aside>

                <div className="search-results">
                    <div className="search-toolbar" ref={toolbarRef}>
                        <span className="muted">{loading ? "Aranıyor…" : `${total} sonuç`}</span>
                        <div className="search-toolbar-right">
                            <button className="btn btn-ghost btn-sm filter-toggle" onClick={() => setFiltersOpen((o) => !o)}>
                                <Icon name="filter" size={14} /> Filtreler{activeCount > 0 ? ` (${activeCount})` : ""}
                            </button>
                            <label className="sort-select">
                                <span className="muted">Sırala:</span>
                                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                                    {SORTS.map((s) => (
                                        <option key={s.v} value={s.v}>{s.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    {loading && results.length === 0 ? (
                        <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
                    ) : results.length > 0 ? (
                        <div className="grid-cards">
                            {results.map((p) => (
                                <PerfumeCard key={p.slug} perfume={p} />
                            ))}
                        </div>
                    ) : (
                        <p className="empty">Filtrelerinize uygun parfüm bulunamadı. Filtreleri gevşetmeyi deneyin.</p>
                    )}
                </div>
            </div>
        </>
    );
}

function FilterGroup({ title, children, scroll }: { title: string; children: React.ReactNode; scroll?: boolean }) {
    return (
        <div className="filter-group">
            <h3 className="filter-title">{title}</h3>
            <div className={`filter-opts ${scroll ? "scroll" : ""}`}>{children}</div>
        </div>
    );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <label className="filter-check">
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span>{label}</span>
        </label>
    );
}
