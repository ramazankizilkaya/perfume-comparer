"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Icon from "./Icon";
import GenderControl, { MobileGenderOptions } from "./GenderControl";
import UserMenu, { MobileAccount } from "./UserMenu";
import PerfumeAdvisorModal from "./PerfumeAdvisorModal";
import { API_BASE, perfumeHref, brandHref, blogHref, searchHref, compareHref, localeHref, genderLabel, mediaUrl } from "@/lib/urls";

interface AutocompletePerfume {
    name: string;
    slug: string;
    brandName: string;
    imageUrl?: string;
    gender?: string;
    path: string;
}

interface AutocompleteItem {
    name: string;
    slug: string;
}

interface AiPerfumeItem {
    id?: number;
    name: string;
    slug: string;
    brand?: { name: string; slug: string };
    brandName?: string;
    gender: string;
    imageUrl?: string | null;
    path: string;
    topAccord?: string | null;
    avgRating?: number;
}

interface AiSearchResponse {
    query: string;
    aiSummary?: string;
    filterExplanation?: string;
    items?: AiPerfumeItem[];
    perfumes?: AiPerfumeItem[];
    /** Yapay zekâ gerçekten çalıştı mı? False ise sonuçlar klasik aramadan gelir. */
    aiUsed?: boolean;
}

interface AutocompleteData {
    perfumes: AutocompletePerfume[];
    brands: AutocompleteItem[];
    notes: AutocompleteItem[];
    accords: AutocompleteItem[];
    blogs: AutocompleteItem[];
}

const EMPTY: AutocompleteData = { perfumes: [], brands: [], notes: [], accords: [], blogs: [] };

type Theme = "light" | "dark";
const THEME_KEY = "theme";
// localStorage kapalıysa (gizli pencere, site verisi engeli) tema sayfa açık kaldığı sürece burada yaşar.
let memoryTheme: Theme = "light";
const themeListeners = new Set<() => void>();

function readTheme(): Theme {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "dark" || saved === "light") return saved;
    } catch {
        /* erişim yok; bellek yedeği kullanılır */
    }
    return memoryTheme;
}

function writeTheme(next: Theme): void {
    memoryTheme = next;
    try {
        localStorage.setItem(THEME_KEY, next);
    } catch {
        /* kaydedilemese de bu oturumda tema değişir */
    }
    themeListeners.forEach((fn) => fn());
}

function subscribeTheme(cb: () => void): () => void {
    themeListeners.add(cb);
    return () => {
        themeListeners.delete(cb);
    };
}

export default function Header() {
    const [query, setQuery] = useState("");
    // Öneriler ve yapay zekâ sonucu, ait oldukları sorguyla birlikte saklanır; sorgu değişince
    // eski yapay zekâ sonucu kendiliğinden düşer (yeni aramada eski liste görünmez).
    const [fetched, setFetched] = useState<{ q: string; data: AutocompleteData } | null>(null);
    const [ai, setAi] = useState<{ q: string; data: AiSearchResponse } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [open, setOpen] = useState(false);
    // Mobil menü, açıldığı sayfaya bağlıdır: sayfa değişince türetilmiş değer kapanır.
    const [navOpenPath, setNavOpenPath] = useState<string | null>(null);
    const [advisorOpen, setAdvisorOpen] = useState(false);

    const boxRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const isSearchPage = pathname?.includes("/ara") || pathname?.includes("/detayli-arama");
    const mobileNavOpen = navOpenPath !== null && navOpenPath === pathname;
    const closeMobileNav = () => setNavOpenPath(null);

    // Tema: sunucuda ve hydration sırasında "light", tarayıcıda kayıtlı değer.
    const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as Theme);

    useEffect(() => {
        document.body.classList.toggle("dark-mode", theme === "dark");
    }, [theme]);

    const toggleTheme = () => writeTheme(theme === "dark" ? "light" : "dark");

    const q = query.trim();
    const results: AutocompleteData = q.length >= 2 && fetched ? fetched.data : EMPTY;
    const aiResult: AiSearchResponse | null = ai && ai.q === q ? ai.data : null;
    const showDropdown = open && q.length >= 2;

    const runAiSearch = async (qText: string) => {
        const term = qText.trim();
        if (!term) return;
        setAiLoading(true);
        setOpen(true);
        try {
            const res = await fetch(`${API_BASE}/api/search/ai?q=${encodeURIComponent(term)}`);
            if (res.ok) {
                const data = await res.json();
                // Cevap hangi sorguya aitse onunla saklanır; kutudaki metin değiştiyse gösterilmez.
                setAi({ q: term, data });
            }
        } catch {
            /* sessizce geç */
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        if (q.length < 2) return;

        // Yazarken yalnızca veritabanı önerisi çalışır. Yapay zekâ araması
        // Enter'a basılınca tetiklenir; her tuş vuruşunda modele gitmek hem
        // yavaş hem de günlük istek hakkını birkaç aramada bitiriyordu.
        // Hızlı yazarken önceki istek iptal edilir; eski cevap yeni öneri listesinin üstüne yazılmaz.
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/search/autocomplete?q=${encodeURIComponent(q)}`, {
                    signal: controller.signal,
                });
                if (res.ok) {
                    const data = await res.json();
                    if (controller.signal.aborted) return;
                    setFetched({ q, data });
                    setOpen(true);
                }
            } catch {
                /* arama önerisi sessizce geç */
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q]);

    // Hamburger menü açıkken Esc tuşu menüyü kapatır.
    useEffect(() => {
        if (!mobileNavOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setNavOpenPath(null);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [mobileNavOpen]);

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const goto = (href: string) => {
        setQuery("");
        setOpen(false);
        setAi(null);
        router.push(href);
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!q) return;

        // Sayfa yönlendirmesi yapma, sonucu doğrudan input altında aç ve AI ara
        setOpen(true);
        runAiSearch(q);
    };

    const aiPerfumes = aiResult?.items ?? aiResult?.perfumes ?? [];

    const aiMapped = aiPerfumes.map((p) => ({
        name: p.name,
        slug: p.slug,
        brandName: p.brand?.name || p.brandName || "",
        gender: p.gender,
        imageUrl: p.imageUrl,
        path: p.path,
        isAi: aiResult?.aiUsed === true,
    }));

    const stdMapped = (results.perfumes ?? []).map((p) => ({
        name: p.name,
        slug: p.slug,
        brandName: p.brandName,
        gender: p.gender,
        imageUrl: p.imageUrl,
        path: p.path,
        isAi: false,
    }));

    // Kullanıcı "yapay zeka ile ara" dediyse önce onun sonuçları, ardından
    // normal arama sonuçları listelenir; aynı parfüm iki kez görünmez.
    const allPerfumes = [...aiMapped, ...stdMapped]
        .filter((p, index, self) => index === self.findIndex((t) => t.slug === p.slug));

    const hasResults =
        allPerfumes.length > 0 ||
        (results.brands?.length ?? 0) > 0 ||
        (results.notes?.length ?? 0) > 0 ||
        (results.accords?.length ?? 0) > 0 ||
        (results.blogs?.length ?? 0) > 0;

    return (
        <header className="site-header">
            <div className="header-main">
                <div className="shell header-inner">
                    <Link href={localeHref("/")} className="logo" aria-label="Parfümetre">
                        <img
                            src="/logo.png"
                            alt="Parfümetre - Parfüm Karşılaştırma ve Koku Rehberi"
                            className="site-logo-img light-only"
                            width={178}
                            height={42}
                        />
                        <img
                            src="/logo-dark.png"
                            alt="Parfümetre - Parfüm Karşılaştırma ve Koku Rehberi"
                            className="site-logo-img dark-only"
                            width={178}
                            height={42}
                        />
                    </Link>

                    <nav className="site-nav">
                        <button
                            type="button"
                            className="nav-link nav-btn-advisor"
                            onClick={() => setAdvisorOpen(true)}
                            aria-label="Yapay Zekâ ile Parfüm Önerisi Al"
                        >
                            <Icon name="sparkle" size={14} />
                            <span>Bana Parfüm Öner</span>
                        </button>
                        <Link href={compareHref()} className="nav-link">Karşılaştır</Link>
                        <Link href={searchHref()} className="nav-link">Detaylı Arama</Link>
                        <Link href={brandHref()} className="nav-link nav-link-late">Markalar</Link>
                        <Link href={blogHref()} className="nav-link nav-link-late">Rehber</Link>
                        <Link
                            href={localeHref("/")}
                            className="icon-btn home-btn"
                            aria-label="Anasayfa"
                            data-tooltip="Anasayfa"
                        >
                            <Icon name="home" size={17} />
                        </Link>
                        <GenderControl />
                        <button
                            className="icon-btn theme-toggle-btn"
                            onClick={toggleTheme}
                            aria-label="Temayı değiştir"
                            data-tooltip={theme === "dark" ? "Aydınlık Mod" : "Karanlık Mod"}
                        >
                            <Icon name={theme === "dark" ? "sun" : "moon"} />
                        </button>
                        <UserMenu />
                        <button
                            type="button"
                            className="icon-btn mobile-menu-toggle"
                            onClick={() => setNavOpenPath(mobileNavOpen ? null : pathname)}
                            aria-label="Menüyü aç/kapat"
                            data-tooltip="Menü"
                            aria-expanded={mobileNavOpen}
                        >
                            <Icon name={mobileNavOpen ? "close" : "menu"} size={18} />
                        </button>
                    </nav>
                </div>

                {mobileNavOpen && (
                    <>
                        <button
                            type="button"
                            className="mobile-nav-backdrop"
                            aria-label="Menüyü kapat"
                            tabIndex={-1}
                            onClick={closeMobileNav}
                        />
                        <div className="shell mobile-nav-panel">
                            <div className="mobile-nav-links" role="dialog" aria-label="Mobil Menü">
                                <button
                                    type="button"
                                    className="mobile-nav-link mobile-nav-early mobile-advisor-btn"
                                    onClick={() => {
                                        closeMobileNav();
                                        setAdvisorOpen(true);
                                    }}
                                >
                                    <Icon name="sparkle" size={16} />
                                    <span>Bana Parfüm Öner</span>
                                </button>
                                <Link href={localeHref("/")} className="mobile-nav-link mobile-nav-early" onClick={closeMobileNav}>
                                    <Icon name="home" size={16} />
                                    <span>Anasayfa</span>
                                </Link>
                                <Link href={compareHref()} className="mobile-nav-link mobile-nav-early" onClick={closeMobileNav}>
                                    <Icon name="swap" size={16} />
                                    <span>Karşılaştır</span>
                                </Link>
                                <Link href={searchHref()} className="mobile-nav-link mobile-nav-early" onClick={closeMobileNav}>
                                    <Icon name="search" size={16} />
                                    <span>Detaylı Arama</span>
                                </Link>
                                <Link href={brandHref()} className="mobile-nav-link" onClick={closeMobileNav}>
                                    <Icon name="layers" size={16} />
                                    <span>Markalar</span>
                                </Link>
                                <Link href={blogHref()} className="mobile-nav-link" onClick={closeMobileNav}>
                                    <Icon name="calendar" size={16} />
                                    <span>Rehber</span>
                                </Link>

                                <div className="mobile-only-group">
                                    <div className="mobile-menu-divider" />
                                    <MobileGenderOptions />
                                    <button type="button" className="mobile-nav-link mobile-theme-btn" onClick={toggleTheme}>
                                        <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
                                        <span>{theme === "dark" ? "Aydınlık Mod" : "Karanlık Mod"}</span>
                                    </button>

                                    <div className="mobile-menu-divider" />
                                    <MobileAccount onNavigate={closeMobileNav} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {!isSearchPage && (
                <div className="header-search-strip">
                    <div className="shell">
                        <div className="header-search-full" ref={boxRef}>
                            <form className="field search-field-full" onSubmit={handleSearchSubmit}>
                                <Icon name="search" />
                                <input
                                    type="text"
                                    placeholder="Parfüm, marka, nota veya doğal dil ile ara (ör. kışlık hafif erkek kokusu)…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onFocus={() => q.length >= 2 && setOpen(true)}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    aria-label="Parfüm ara"
                                />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery("");
                                        setFetched(null);
                                        setAi(null);
                                        setOpen(false);
                                    }}
                                    aria-label="Aramayı temizle"
                                >
                                    <Icon name="close" size={14} />
                                </button>
                            )}
                        </form>

                        {showDropdown && (
                            <div className="autocomplete autocomplete-rich">
                                {!aiLoading && (
                                    <button
                                        type="button"
                                        className="ac-ai-trigger"
                                        onClick={() => runAiSearch(query)}
                                        disabled={aiPerfumes.length > 0}
                                    >
                                        <Icon name="sparkle" size={15} />
                                        <span className="ac-ai-trigger-text">
                                            {aiPerfumes.length > 0
                                                ? <>Yapay zeka sonuçları listelendi</>
                                                : <>Yapay zeka ile arat: <strong>{q}</strong></>}
                                        </span>
                                        {aiPerfumes.length === 0 && <span className="ac-ai-tag">AI</span>}
                                    </button>
                                )}

                                {aiLoading && (
                                    <div className="ac-ai-loading">
                                        <Icon name="sparkle" size={14} />
                                        <span>Yapay zeka analiz ediyor…</span>
                                    </div>
                                )}

                                {!hasResults && !aiLoading && (
                                    <div className="ac-empty">Sonuç bulunamadı.</div>
                                )}

                                {/* Parfümler (Standart ve AI Eşleşmeleri) */}
                                {allPerfumes.length > 0 && (
                                    <div className="ac-section">
                                        <div className="ac-group-title">Parfümler</div>
                                        {allPerfumes.map((p) => (
                                            <button
                                                key={p.slug}
                                                className="ac-item"
                                                onClick={() => goto(perfumeHref(p.path, p.slug))}
                                            >
                                                {p.imageUrl && <img className="ac-thumb" src={mediaUrl(p.imageUrl)} alt={`${p.brandName} ${p.name}`} />}
                                                <span className="ac-item-info">
                                                    <span className="ac-name">{p.name}</span>
                                                    <span className="ac-meta">
                                                        {p.brandName}
                                                        {p.gender ? ` · ${genderLabel(p.gender)}` : ""}
                                                    </span>
                                                </span>
                                                {p.isAi && <span className="ac-ai-tag">AI</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Markalar */}
                                {results.brands?.length > 0 && (
                                    <div className="ac-section">
                                        <div className="ac-group-title">Markalar</div>
                                        {results.brands.map((b) => (
                                            <button key={b.slug} className="ac-item" onClick={() => goto(brandHref(b.slug))}>
                                                <span className="ac-name">{b.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Notalar */}
                                {results.notes?.length > 0 && (
                                    <div className="ac-section">
                                        <div className="ac-group-title">Notalar</div>
                                        <div className="ac-pill-list">
                                            {results.notes.map((n) => (
                                                <button
                                                    key={n.slug}
                                                    className="ac-pill-btn"
                                                    onClick={() => goto(searchHref({ note: n.slug }))}
                                                    title={`İçinde ${n.name} notası olan parfümleri listele`}
                                                >
                                                    🌿 {n.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Akorlar */}
                                {results.accords?.length > 0 && (
                                    <div className="ac-section">
                                        <div className="ac-group-title">Ana Akorlar</div>
                                        <div className="ac-pill-list">
                                            {results.accords.map((a) => (
                                                <button
                                                    key={a.slug}
                                                    className="ac-pill-btn ac-accord-pill"
                                                    onClick={() => goto(searchHref({ accord: a.slug }))}
                                                    title={`${a.name} akoruna sahip parfümleri listele`}
                                                >
                                                    ✨ {a.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rehber & Bloglar */}
                                {results.blogs?.length > 0 && (
                                    <div className="ac-section">
                                        <div className="ac-group-title">Rehber & Blog</div>
                                        {results.blogs.map((b) => (
                                            <button key={b.slug} className="ac-item" onClick={() => goto(blogHref(b.slug))}>
                                                <span className="ac-name">📖 {b.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}
            <PerfumeAdvisorModal isOpen={advisorOpen} onClose={() => setAdvisorOpen(false)} />
        </header>
    );
}
