"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import GenderControl from "./GenderControl";
import UserMenu from "./UserMenu";
import { API_BASE, perfumeHref, brandHref, genderLabel, mediaUrl } from "@/lib/urls";

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

export default function Header() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<AutocompleteData>(EMPTY);
    const [aiResult, setAiResult] = useState<AiSearchResponse | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");

    const boxRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        const next = saved === "dark" ? "dark" : "light";
        setTheme(next);
        document.body.classList.toggle("dark-mode", next === "dark");
    }, []);

    const toggleTheme = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.body.classList.toggle("dark-mode", next === "dark");
        localStorage.setItem("theme", next);
    };

    const runAiSearch = async (qText: string) => {
        const q = qText.trim();
        if (!q) return;
        setAiLoading(true);
        setOpen(true);
        try {
            const res = await fetch(`${API_BASE}/api/search/ai?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                setAiResult(data);
            }
        } catch {
            /* sessizce geç */
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults(EMPTY);
            setAiResult(null);
            setOpen(false);
            return;
        }

        // Yazarken yalnızca veritabanı önerisi çalışır. Yapay zekâ araması
        // Enter'a basılınca tetiklenir; her tuş vuruşunda modele gitmek hem
        // yavaş hem de günlük istek hakkını birkaç aramada bitiriyordu.
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/search/autocomplete?q=${encodeURIComponent(q)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                    setOpen(true);
                }
            } catch {
                /* arama önerisi sessizce geç */
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [query]);

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
        setAiResult(null);
        router.push(href);
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const q = query.trim();
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
            <div className="shell header-inner">
                <Link href="/" className="logo">
                    Aura<em>Compare</em>
                </Link>

                <nav className="site-nav">
                    <Link href="/ara" className="nav-link">Detaylı Arama</Link>
                    <Link href="/marka" className="nav-link">Markalar</Link>
                    <Link href="/blog" className="nav-link">Rehber</Link>
                    <GenderControl />
                    <button className="icon-btn" onClick={toggleTheme} aria-label="Temayı değiştir">
                        <Icon name={theme === "dark" ? "sun" : "moon"} />
                    </button>
                    <UserMenu />
                </nav>
            </div>

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
                                onFocus={() => query.trim().length >= 2 && setOpen(true)}
                                autoComplete="off"
                                aria-label="Parfüm ara"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery("");
                                        setResults(EMPTY);
                                        setAiResult(null);
                                        setOpen(false);
                                    }}
                                    aria-label="Aramayı temizle"
                                >
                                    <Icon name="close" size={14} />
                                </button>
                            )}
                        </form>

                        {open && (
                            <div className="autocomplete autocomplete-rich">
                                {query.trim().length >= 2 && !aiLoading && (
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
                                                : <>Yapay zeka ile arat: <strong>{query.trim()}</strong></>}
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

                                {!hasResults && !aiLoading && query.trim().length >= 2 && (
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
                                                {p.imageUrl && <img className="ac-thumb" src={mediaUrl(p.imageUrl)} alt="" />}
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
                                                    onClick={() => goto(`/ara?note=${n.slug}`)}
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
                                                    onClick={() => goto(`/ara?accord=${a.slug}`)}
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
                                            <button key={b.slug} className="ac-item" onClick={() => goto(`/blog/${b.slug}`)}>
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
        </header>
    );
}
