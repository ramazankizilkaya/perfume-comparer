"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { PerfumeCard, type PerfumeCardData } from "@/components/PerfumeCard";
import { API_BASE, searchHref } from "@/lib/urls";
import { useAuth, useFavorites } from "@/lib/stores";
import { useLocalState } from "@/lib/clientStore";
import {
    buildApiQuery,
    GENDERS,
    parseSearchQuery,
    SORTS,
    toUrlParams,
    type SearchMeta,
    type SearchQuery,
} from "@/lib/searchParams";

const LAYER_LABELS: Record<string, string> = { ust: "Üst", orta: "Orta", alt: "Alt" };

/**
 * Detaylı aramanın etkileşimli bölümü. H1, giriş cümlesi, ilk sonuç sayfası ve filtre
 * sözlüğü sunucuda (app/ara/page.tsx) hazırlanıp buraya verilir; bu bileşen ilk boyamada
 * "Yükleniyor…" göstermez, sunucunun bastığı kartlarla açılır ve yalnızca kullanıcı
 * filtre değiştirince API'ye gider. Adres değişince üst bileşen `key` ile yeniden kurar.
 */
export default function SearchClient({
    initialQuery,
    initialMeta,
    initialResults,
    initialTotal,
    serverFetched,
}: {
    initialQuery: SearchQuery;
    initialMeta: SearchMeta | null;
    initialResults: PerfumeCardData[];
    initialTotal: number;
    /** true ise ilk sayfa sunucudan geldi, mount'ta tekrar istek atılmaz. */
    serverFetched: boolean;
}) {
    const pathname = usePathname();
    const { user, token, ready } = useAuth();
    const { items: favItems } = useFavorites();

    const [q, setQ] = useState(initialQuery.q);
    const [gender, setGender] = useState<string[]>(initialQuery.gender);
    const [family, setFamily] = useState<string[]>(initialQuery.family);
    const [concentration, setConcentration] = useState<string[]>(initialQuery.concentration);
    const [brand, setBrand] = useState<string[]>(initialQuery.brand);
    const [accord, setAccord] = useState<string[]>(initialQuery.accord);
    const [note, setNote] = useState<string[]>(initialQuery.note);
    const [noteLayer, setNoteLayer] = useState(initialQuery.noteLayer);
    const [season, setSeason] = useState<string[]>(initialQuery.season);
    const [ageGroup, setAgeGroup] = useState<string[]>(initialQuery.ageGroup);
    const [sort, setSort] = useState(initialQuery.sort);
    const [userFilter, setUserFilter] = useState(initialQuery.userFilter);
    const [isAi, setIsAi] = useState(initialQuery.ai);

    // Arama içi filtre aramaları (Marka, Nota, Akor)
    const [brandSearch, setBrandSearch] = useState("");
    const [noteSearch, setNoteSearch] = useState("");
    const [accordSearch, setAccordSearch] = useState("");

    // Panellerin açık/kapalı durumu: akordiyon (tek seferde yalnızca tek bölüm açık).
    // Yalnızca kullanıcının elle açıp kapattığı tercih saklanır (localStorage).
    const [savedGroups, setSavedGroups] = useLocalState<Record<string, boolean>>("aura_filter_groups_open", {});
    const openGroups = useMemo(() => {
        const activeKeys = Object.keys(savedGroups ?? {}).filter((k) => savedGroups[k]);
        return activeKeys.length > 0 ? { [activeKeys[0]]: true } : {};
    }, [savedGroups]);

    const toggleGroup = (id: string) => {
        // Açık olan bölüme tıklandıysa kapatılır; başka bölüme tıklandıysa diğeri kapanıp sadece o açılır.
        setSavedGroups(openGroups[id] ? {} : { [id]: true });
    };

    // Tarayıcı geri/ileri (popstate) senkronizasyonu
    const lastSpString = useRef(toUrlParams(initialQuery).toString());
    useEffect(() => {
        const onPopState = () => {
            const currentSearch = new URLSearchParams(window.location.search);
            const cur = currentSearch.toString();
            if (cur !== lastSpString.current) {
                lastSpString.current = cur;
                const next = parseSearchQuery(currentSearch);
                setQ(next.q);
                setGender(next.gender);
                setFamily(next.family);
                setConcentration(next.concentration);
                setBrand(next.brand);
                setAccord(next.accord);
                setNote(next.note);
                setNoteLayer(next.noteLayer);
                setSeason(next.season);
                setAgeGroup(next.ageGroup);
                setSort(next.sort);
                setUserFilter(next.userFilter);
                setIsAi(next.ai);
            }
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const isFirstSearch = useRef(true);

    const [meta, setMeta] = useState<SearchMeta | null>(initialMeta);
    const [results, setResults] = useState<PerfumeCardData[]>(initialResults);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(!serverFetched);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [aiUsed, setAiUsed] = useState(false);

    // Filtre sözlüğü sunucudan gelmediyse (API hatası) tarayıcıda bir kez denenir.
    useEffect(() => {
        if (initialMeta) return;
        const controller = new AbortController();
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/meta/filters`, { signal: controller.signal });
                if (r.ok && !controller.signal.aborted) setMeta(await r.json());
            } catch {
                /* meta olmadan da arama çalışır */
            }
        })();
        return () => controller.abort();
    }, [initialMeta]);

    const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
        set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

    const currentQuery: SearchQuery = useMemo(
        () => ({ q: q.trim(), gender, family, concentration, brand, accord, note, noteLayer, season, ageGroup, sort, userFilter, ai: isAi }),
        [q, gender, family, concentration, brand, accord, note, noteLayer, season, ageGroup, sort, userFilter, isAi],
    );

    // Filtre kriterleri değiştiğinde arama
    useEffect(() => {
        if (isFirstSearch.current) {
            isFirstSearch.current = false;
            // İlk sayfa sunucudan geldiyse aynı isteği tekrar atma.
            if (serverFetched) return;
        } else if (toolbarRef.current) {
            const top = toolbarRef.current.getBoundingClientRect().top + window.scrollY;
            if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
        }

        // Hızlı filtre değişiminde önceki istek iptal edilir; eski cevap yeni listenin üstüne yazılmaz.
        const controller = new AbortController();
        const { signal } = controller;

        const t = setTimeout(async () => {
            setLoading(true);
            setPage(1);

            if (isAi && q.trim()) {
                try {
                    const r = await fetch(`${API_BASE}/api/search/ai?q=${encodeURIComponent(q.trim())}`, { signal });
                    if (r.ok) {
                        const d = await r.json();
                        if (signal.aborted) return;
                        setResults(d.items ?? []);
                        setTotal(d.totalCount ?? d.items?.length ?? 0);
                        setAiSummary(d.aiSummary ?? null);
                        setAiUsed(Boolean(d.aiUsed));
                    }
                } catch {
                    if (signal.aborted) return;
                    setResults([]);
                    setAiSummary(null);
                    setAiUsed(false);
                } finally {
                    if (!signal.aborted) setLoading(false);
                }
                return;
            }

            setAiSummary(null);
            setAiUsed(false);
            const p = buildApiQuery(currentQuery, 1, favItems.map((f) => f.slug));

            try {
                const r = await fetch(`${API_BASE}/api/perfumes?${p.toString()}`, {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    signal,
                });
                if (r.ok) {
                    const d = await r.json();
                    if (signal.aborted) return;
                    setResults(d.items ?? []);
                    setTotal(d.totalCount ?? d.items?.length ?? 0);
                }
            } catch {
                if (!signal.aborted) setResults([]);
            } finally {
                if (!signal.aborted) setLoading(false);
            }

            if (signal.aborted) return;
            const newQueryString = toUrlParams(currentQuery).toString();
            const newQuery = newQueryString ? "?" + newQueryString : "";
            const currentSearch = window.location.search;
            if (newQuery !== currentSearch) {
                lastSpString.current = newQueryString;
                const basePath = pathname || window.location.pathname || searchHref();
                window.history.replaceState(null, "", `${basePath}${newQuery}`);
            }
        }, 200);

        return () => {
            clearTimeout(t);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuery, pathname, token, favItems, serverFetched]);

    // Sayfalama (Daha Fazla Göster)
    const loadMore = async () => {
        if (loadingMore || loading || results.length >= total) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        const p = buildApiQuery(currentQuery, nextPage, favItems.map((f) => f.slug));

        try {
            const r = await fetch(`${API_BASE}/api/perfumes?${p.toString()}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (r.ok) {
                const d = await r.json();
                setResults((prev) => [...prev, ...(d.items ?? [])]);
                setPage(nextPage);
            }
        } catch {
            /* ignore */
        } finally {
            setLoadingMore(false);
        }
    };

    const activeCount =
        gender.length + family.length + concentration.length + brand.length +
        accord.length + note.length + season.length + ageGroup.length +
        (q.trim() ? 1 : 0) + (sort ? 1 : 0) + (userFilter ? 1 : 0);

    const clearAll = () => {
        setQ(""); setGender([]); setFamily([]); setConcentration([]);
        setBrand([]); setAccord([]); setNote([]); setNoteLayer("");
        setSeason([]); setAgeGroup([]); setSort(""); setUserFilter("");
        setAiSummary(null);
    };

    // Filtre içi aramalar
    const filteredBrands = useMemo(() => {
        const list = meta?.brands ?? [];
        if (!brandSearch.trim()) return list;
        const s = brandSearch.trim().toLocaleLowerCase("tr");
        return list.filter((b) => b.name.toLocaleLowerCase("tr").includes(s));
    }, [meta?.brands, brandSearch]);

    const filteredNotes = useMemo(() => {
        const list = meta?.notes ?? [];
        if (!noteSearch.trim()) return list;
        const s = noteSearch.trim().toLocaleLowerCase("tr");
        return list.filter((n) => n.name.toLocaleLowerCase("tr").includes(s));
    }, [meta?.notes, noteSearch]);

    const filteredAccords = useMemo(() => {
        const list = meta?.accords ?? [];
        if (!accordSearch.trim()) return list;
        const s = accordSearch.trim().toLocaleLowerCase("tr");
        return list.filter((a) => a.name.toLocaleLowerCase("tr").includes(s));
    }, [meta?.accords, accordSearch]);

    return (
        <>
            <div className="field search-query-field">
                <Icon name="search" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Sonuçlar içinde filtrele… (ör. sauvage, vanilya, edp)"
                    aria-label="Sonuçlar içinde filtrele"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                />
                {q && (
                    <button onClick={() => setQ("")} aria-label="Temizle">
                        <Icon name="close" size={14} />
                    </button>
                )}
            </div>

            <div className="search-layout">
                {/* Masaüstü Filtre Yan Paneli */}
                <aside className="filter-panel filter-panel-desktop">
                    <div className="filter-head">
                        <span className="filter-head-title">
                            <Icon name="filter" size={15} /> Filtreler
                            {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
                        </span>
                        {activeCount > 0 && <button className="link-more" onClick={clearAll}>Temizle</button>}
                    </div>

                    <FilterGroup
                        title="Sıralama & Liste"
                        groupId="sort"
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        <div className="user-filter-box" style={{ marginBottom: "0.6rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--line)" }}>
                            <Check
                                label="Favorilerim"
                                checked={userFilter === "favorites"}
                                onChange={() => setUserFilter(userFilter === "favorites" ? "" : "favorites")}
                            />
                            {ready && user && (
                                <>
                                    <Check
                                        label="Yorum Yazdıklarım"
                                        checked={userFilter === "comments"}
                                        onChange={() => setUserFilter(userFilter === "comments" ? "" : "comments")}
                                    />
                                    <Check
                                        label="Puanladıklarım"
                                        checked={userFilter === "ratings"}
                                        onChange={() => setUserFilter(userFilter === "ratings" ? "" : "ratings")}
                                    />
                                </>
                            )}
                        </div>
                        {SORTS.filter((s) => s.v !== "").map((s) => (
                            <Check
                                key={s.v}
                                label={s.label}
                                checked={sort === s.v}
                                onChange={() => setSort(sort === s.v ? "" : s.v)}
                            />
                        ))}
                    </FilterGroup>

                    <FilterGroup
                        title="Cinsiyet"
                        groupId="gender"
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {GENDERS.map((g) => (
                            <Check key={g.slug} label={g.label} checked={gender.includes(g.slug)} onChange={() => toggle(gender, setGender, g.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup
                        title="Koku ailesi"
                        groupId="family"
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {(meta?.fragranceFamilies ?? []).map((f) => (
                            <Check key={f.slug} label={f.name} checked={family.includes(f.slug)} onChange={() => toggle(family, setFamily, f.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup
                        title="Mevsim"
                        groupId="season"
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {(meta?.seasons ?? []).map((s2) => (
                            <Check key={s2.slug} label={s2.name} checked={season.includes(s2.slug)} onChange={() => toggle(season, setSeason, s2.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup
                        title="Yaş grubu"
                        groupId="ageGroup"
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {(meta?.ageGroups ?? []).map((a) => (
                            <Check key={a.slug} label={a.name} checked={ageGroup.includes(a.slug)} onChange={() => toggle(ageGroup, setAgeGroup, a.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup
                        title="Konsantrasyon"
                        groupId="concentration"
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {(meta?.concentrations ?? []).map((c) => (
                            <Check key={c.slug} label={c.name} checked={concentration.includes(c.slug)} onChange={() => toggle(concentration, setConcentration, c.slug)} />
                        ))}
                    </FilterGroup>

                    <FilterGroup
                        title="Ana akorlar"
                        groupId="accord"
                        scroll
                        searchPlaceholder="Akor ara…"
                        searchValue={accordSearch}
                        onSearchChange={setAccordSearch}
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {filteredAccords.length > 0 ? (
                            filteredAccords.map((a) => (
                                <Check key={a.slug} label={a.name} checked={accord.includes(a.slug)} onChange={() => toggle(accord, setAccord, a.slug)} />
                            ))
                        ) : (
                            <p className="muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>Akor bulunamadı</p>
                        )}
                    </FilterGroup>

                    <FilterGroup
                        title="Notalar"
                        groupId="note"
                        scroll
                        searchPlaceholder="Nota ara…"
                        searchValue={noteSearch}
                        onSearchChange={setNoteSearch}
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {filteredNotes.length > 0 ? (
                            filteredNotes.map((n) => (
                                <Check key={n.slug} label={n.name} checked={note.includes(n.slug)} onChange={() => { setNoteLayer(""); toggle(note, setNote, n.slug); }} />
                            ))
                        ) : (
                            <p className="muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>Nota bulunamadı</p>
                        )}
                    </FilterGroup>

                    <FilterGroup
                        title="Marka"
                        groupId="brand"
                        scroll
                        searchPlaceholder="Marka ara…"
                        searchValue={brandSearch}
                        onSearchChange={setBrandSearch}
                        openGroups={openGroups}
                        onToggleGroup={toggleGroup}
                    >
                        {filteredBrands.length > 0 ? (
                            filteredBrands.map((b) => (
                                <Check key={b.slug} label={b.name} checked={brand.includes(b.slug)} onChange={() => toggle(brand, setBrand, b.slug)} />
                            ))
                        ) : (
                            <p className="muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>Marka bulunamadı</p>
                        )}
                    </FilterGroup>
                </aside>

                {/* Sonuç Alanı */}
                <div className="search-results">
                    {/* Yüzen / Yapışkan Filtre & Sıralama Çubuğu (Mobilde Tek Satır Floating Bar) */}
                    <div className="search-toolbar-sticky-wrap" ref={toolbarRef}>
                        <div className="search-toolbar">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm mobile-filter-toggle-btn"
                                    onClick={() => setFiltersOpen((o) => !o)}
                                    aria-expanded={filtersOpen}
                                >
                                    <Icon name="filter" size={14} />
                                    <span>Filtreler{activeCount > 0 ? ` (${activeCount})` : ""}</span>
                                    <span style={{ fontSize: "0.75em", opacity: 0.75 }}>{filtersOpen ? "▲" : "▼"}</span>
                                </button>
                                <span className="muted mobile-toolbar-count">
                                    {loading ? "Aranıyor…" : `${total} sonuç`}
                                </span>
                            </div>

                            {note.length > 0 && noteLayer && (
                                <button
                                    type="button"
                                    className="layer-chip"
                                    onClick={() => setNoteLayer("")}
                                    title="Katman daraltmasını kaldır"
                                >
                                    {LAYER_LABELS[noteLayer] ?? noteLayer} notası <Icon name="close" size={11} />
                                </button>
                            )}

                        </div>

                        {/* Mobilde Tıklanınca Açılan Dropdown Filtre Paneli */}
                        {filtersOpen && (
                            <div className="mobile-filter-dropdown-panel">
                                <FilterGroup
                                    title="Sıralama & Liste"
                                    groupId="sort"
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    <div className="user-filter-box" style={{ marginBottom: "0.6rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--line)" }}>
                                        <Check
                                            label="Favorilerim"
                                            checked={userFilter === "favorites"}
                                            onChange={() => setUserFilter(userFilter === "favorites" ? "" : "favorites")}
                                        />
                                        {ready && user && (
                                            <>
                                                <Check
                                                    label="Yorum Yazdıklarım"
                                                    checked={userFilter === "comments"}
                                                    onChange={() => setUserFilter(userFilter === "comments" ? "" : "comments")}
                                                />
                                                <Check
                                                    label="Puanladıklarım"
                                                    checked={userFilter === "ratings"}
                                                    onChange={() => setUserFilter(userFilter === "ratings" ? "" : "ratings")}
                                                />
                                            </>
                                        )}
                                    </div>
                                    {SORTS.filter((s) => s.v !== "").map((s) => (
                                        <Check
                                            key={s.v}
                                            label={s.label}
                                            checked={sort === s.v}
                                            onChange={() => setSort(sort === s.v ? "" : s.v)}
                                        />
                                    ))}
                                </FilterGroup>

                                <FilterGroup
                                    title="Cinsiyet"
                                    groupId="gender"
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {GENDERS.map((g) => (
                                        <Check key={g.slug} label={g.label} checked={gender.includes(g.slug)} onChange={() => toggle(gender, setGender, g.slug)} />
                                    ))}
                                </FilterGroup>

                                <FilterGroup
                                    title="Koku ailesi"
                                    groupId="family"
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {(meta?.fragranceFamilies ?? []).map((f) => (
                                        <Check key={f.slug} label={f.name} checked={family.includes(f.slug)} onChange={() => toggle(family, setFamily, f.slug)} />
                                    ))}
                                </FilterGroup>

                                <FilterGroup
                                    title="Mevsim"
                                    groupId="season"
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {(meta?.seasons ?? []).map((s2) => (
                                        <Check key={s2.slug} label={s2.name} checked={season.includes(s2.slug)} onChange={() => toggle(season, setSeason, s2.slug)} />
                                    ))}
                                </FilterGroup>

                                <FilterGroup
                                    title="Yaş grubu"
                                    groupId="ageGroup"
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {(meta?.ageGroups ?? []).map((a) => (
                                        <Check key={a.slug} label={a.name} checked={ageGroup.includes(a.slug)} onChange={() => toggle(ageGroup, setAgeGroup, a.slug)} />
                                    ))}
                                </FilterGroup>

                                <FilterGroup
                                    title="Konsantrasyon"
                                    groupId="concentration"
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {(meta?.concentrations ?? []).map((c) => (
                                        <Check key={c.slug} label={c.name} checked={concentration.includes(c.slug)} onChange={() => toggle(concentration, setConcentration, c.slug)} />
                                    ))}
                                </FilterGroup>

                                <FilterGroup
                                    title="Ana akorlar"
                                    groupId="accord"
                                    scroll
                                    searchPlaceholder="Akor ara…"
                                    searchValue={accordSearch}
                                    onSearchChange={setAccordSearch}
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {filteredAccords.length > 0 ? (
                                        filteredAccords.map((a) => (
                                            <Check key={a.slug} label={a.name} checked={accord.includes(a.slug)} onChange={() => toggle(accord, setAccord, a.slug)} />
                                        ))
                                    ) : (
                                        <p className="muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>Akor bulunamadı</p>
                                    )}
                                </FilterGroup>

                                <FilterGroup
                                    title="Notalar"
                                    groupId="note"
                                    scroll
                                    searchPlaceholder="Nota ara…"
                                    searchValue={noteSearch}
                                    onSearchChange={setNoteSearch}
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {filteredNotes.length > 0 ? (
                                        filteredNotes.map((n) => (
                                            <Check key={n.slug} label={n.name} checked={note.includes(n.slug)} onChange={() => { setNoteLayer(""); toggle(note, setNote, n.slug); }} />
                                        ))
                                    ) : (
                                        <p className="muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>Nota bulunamadı</p>
                                    )}
                                </FilterGroup>

                                <FilterGroup
                                    title="Marka"
                                    groupId="brand"
                                    scroll
                                    searchPlaceholder="Marka ara…"
                                    searchValue={brandSearch}
                                    onSearchChange={setBrandSearch}
                                    openGroups={openGroups}
                                    onToggleGroup={toggleGroup}
                                >
                                    {filteredBrands.length > 0 ? (
                                        filteredBrands.map((b) => (
                                            <Check key={b.slug} label={b.name} checked={brand.includes(b.slug)} onChange={() => toggle(brand, setBrand, b.slug)} />
                                        ))
                                    ) : (
                                        <p className="muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>Marka bulunamadı</p>
                                    )}
                                </FilterGroup>
                            </div>
                        )}
                    </div>

                    {/* Aktif Filtre Rozetleri */}
                    {activeCount > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBlockEnd: "1rem", alignItems: "center" }}>
                            {userFilter && (
                                <span className="active-filter-badge">
                                    {userFilter === "favorites" ? "Favorilerim" : userFilter === "comments" ? "Yorum Yazdıklarım" : userFilter === "ratings" ? "Puanladıklarım" : userFilter}
                                    <button type="button" onClick={() => setUserFilter("")} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            )}
                            {sort && (
                                <span className="active-filter-badge">
                                    {SORTS.find((s) => s.v === sort)?.label}
                                    <button type="button" onClick={() => setSort("")} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            )}
                            {gender.map((g) => (
                                <span key={g} className="active-filter-badge">
                                    {GENDERS.find((x) => x.slug === g)?.label ?? g}
                                    <button type="button" onClick={() => toggle(gender, setGender, g)} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            ))}
                            {family.map((f) => (
                                <span key={f} className="active-filter-badge">
                                    {meta?.fragranceFamilies.find((x) => x.slug === f)?.name ?? f}
                                    <button type="button" onClick={() => toggle(family, setFamily, f)} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            ))}
                            {concentration.map((c) => (
                                <span key={c} className="active-filter-badge">
                                    {meta?.concentrations.find((x) => x.slug === c)?.name ?? c}
                                    <button type="button" onClick={() => toggle(concentration, setConcentration, c)} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            ))}
                            {brand.map((b) => (
                                <span key={b} className="active-filter-badge">
                                    {meta?.brands.find((x) => x.slug === b)?.name ?? b}
                                    <button type="button" onClick={() => toggle(brand, setBrand, b)} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            ))}
                            {accord.map((a) => (
                                <span key={a} className="active-filter-badge">
                                    {meta?.accords.find((x) => x.slug === a)?.name ?? a}
                                    <button type="button" onClick={() => toggle(accord, setAccord, a)} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            ))}
                            {note.map((n) => (
                                <span key={n} className="active-filter-badge">
                                    {meta?.notes.find((x) => x.slug === n)?.name ?? n}
                                    <button type="button" onClick={() => toggle(note, setNote, n)} aria-label="Filtreyi kaldır">✕</button>
                                </span>
                            ))}
                            <button onClick={clearAll} className="link-more" style={{ fontSize: "0.75rem", marginInlineStart: "0.25rem" }}>Tümünü Temizle</button>
                        </div>
                    )}

                    {aiSummary && (
                        <div className="ai-search-banner">
                            <div className="ai-banner-header">
                                <Icon name="sparkle" size={16} />
                                <span>{aiUsed ? "Yapay Zeka Arama Analizi" : "Arama Sonucu"}</span>
                            </div>
                            <p className="ai-banner-text">{aiSummary}</p>
                        </div>
                    )}

                    {/* Sonuç Kartları */}
                    {loading && results.length === 0 ? (
                        <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
                    ) : results.length > 0 ? (
                        <>
                            <div className="grid-cards">
                                {results.map((p) => (
                                    <PerfumeCard key={p.slug} perfume={p} />
                                ))}
                            </div>

                            {/* Sayfalama */}
                            {results.length < total ? (
                                <div className="load-more-container">
                                    <button
                                        type="button"
                                        className="load-more-btn"
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? (
                                            <>
                                                <div className="spinner" style={{ width: 14, height: 14 }} /> Yükleniyor…
                                            </>
                                        ) : (
                                            `Daha Fazla Göster (${results.length} / ${total})`
                                        )}
                                    </button>
                                    <span className="load-more-count">Kalan {total - results.length} parfüm</span>
                                </div>
                            ) : (
                                <div className="load-more-container">
                                    <span className="load-more-count">Toplam {total} parfümün tamamı listelendi.</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="empty">Filtrelerinize uygun parfüm bulunamadı. Filtreleri gevşetmeyi deneyin.</p>
                    )}
                </div>
            </div>
        </>
    );
}

function FilterGroup({
    title,
    groupId,
    children,
    scroll,
    searchPlaceholder,
    searchValue,
    onSearchChange,
    openGroups,
    onToggleGroup,
}: {
    title: string;
    groupId: string;
    children: React.ReactNode;
    scroll?: boolean;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (val: string) => void;
    openGroups: Record<string, boolean>;
    onToggleGroup: (id: string) => void;
}) {
    // SADECE ve SADECE kullanıcının tercihi (localStorage):
    // Kullanıcı açtıysa açık, açmadıysa/kapattıysa KAPALI. Filtre seçili olsa dahi otomatik AÇILMAZ!
    const isOpen = Boolean(openGroups[groupId]);

    return (
        <div className="filter-group">
            <button
                type="button"
                className="filter-title-btn"
                onClick={() => onToggleGroup(groupId)}
                aria-expanded={isOpen}
            >
                <span className="filter-title">{title}</span>
                <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={13} />
            </button>
            {isOpen && (
                <>
                    {searchPlaceholder && (
                        <div className="filter-search-box">
                            <input
                                type="text"
                                value={searchValue ?? ""}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                placeholder={searchPlaceholder}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <div className={`filter-opts ${scroll ? "scroll" : ""}`}>{children}</div>
                </>
            )}
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
