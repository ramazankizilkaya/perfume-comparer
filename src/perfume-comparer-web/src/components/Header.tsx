"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import GenderControl from "./GenderControl";
import UserMenu from "./UserMenu";
import { API_BASE, perfumeHref, genderLabel } from "@/lib/urls";

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

interface AutocompleteData {
    perfumes: AutocompletePerfume[];
    brands: AutocompleteItem[];
    notes: AutocompleteItem[];
}

const EMPTY: AutocompleteData = { perfumes: [], brands: [], notes: [] };

const CATEGORIES: { label: string; href: string }[] = [
    { label: "Erkek", href: "/ara?gender=erkek" },
    { label: "Kadın", href: "/ara?gender=kadin" },
    { label: "Unisex", href: "/ara?gender=unisex" },
    { label: "Oryantal", href: "/ara?family=oryantal" },
    { label: "Odunsu", href: "/ara?family=odunsu" },
    { label: "Ferah", href: "/ara?family=ferah" },
    { label: "Çiçeksi", href: "/ara?family=ciceksi" },
    { label: "Narenciye", href: "/ara?family=narenciye" },
    { label: "Aromatik", href: "/ara?family=aromatik" },
];

export default function Header() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<AutocompleteData>(EMPTY);
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

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults(EMPTY);
            setOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/search/autocomplete?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    setResults(await res.json());
                    setOpen(true);
                }
            } catch {
                /* arama önerisi kritik değil, sessizce geç */
            }
        }, 250);

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
        router.push(href);
    };

    const hasResults = results.perfumes?.length > 0 || results.brands?.length > 0;

    return (
        <>
            <header className="site-header">
                <div className="shell header-inner">
                    <Link href="/" className="logo">
                        Aura<em>Compare</em>
                    </Link>

                    <div className="header-search" ref={boxRef}>
                        <div className="field">
                            <Icon name="search" />
                            <input
                                type="text"
                                placeholder="Parfüm, marka veya nota ara"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => query.trim().length >= 2 && setOpen(true)}
                                autoComplete="off"
                                aria-label="Ara"
                            />
                            {query && (
                                <button onClick={() => { setQuery(""); setResults(EMPTY); setOpen(false); }} aria-label="Aramayı temizle">
                                    <Icon name="close" size={14} />
                                </button>
                            )}
                        </div>

                        {open && (
                            <div className="autocomplete">
                                {!hasResults && <div className="ac-empty">Sonuç bulunamadı.</div>}

                                {results.brands?.length > 0 && (
                                    <div>
                                        <div className="ac-group-title">Markalar</div>
                                        {results.brands.map((b) => (
                                            <button key={b.slug} className="ac-item" onClick={() => goto(`/ara?brand=${b.slug}`)}>
                                                <span className="ac-name">{b.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.perfumes?.length > 0 && (
                                    <div>
                                        <div className="ac-group-title">Parfümler</div>
                                        {results.perfumes.map((p) => (
                                            <button
                                                key={p.slug}
                                                className="ac-item"
                                                onClick={() => goto(perfumeHref(p.path, p.slug))}
                                            >
                                                {p.imageUrl && <img className="ac-thumb" src={p.imageUrl} alt="" />}
                                                <span>
                                                    <span className="ac-name">{p.name}</span>
                                                    <span className="ac-meta">
                                                        {p.brandName}
                                                        {p.gender ? ` · ${genderLabel(p.gender)}` : ""}
                                                    </span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <nav className="site-nav">
                        <Link href="/ara" className="nav-link">Ara</Link>
                        <Link href="/blog" className="nav-link">Rehber</Link>
                        <GenderControl />
                        <button className="icon-btn" onClick={toggleTheme} aria-label="Temayı değiştir">
                            <Icon name={theme === "dark" ? "sun" : "moon"} />
                        </button>
                        <UserMenu />
                    </nav>
                </div>
            </header>

            <nav className="cat-strip" aria-label="Kategoriler">
                <div className="shell cat-strip-inner">
                    <Link href="/" className="cat-link" style={{ fontWeight: 600 }}>
                        Tüm parfümler
                    </Link>
                    {CATEGORIES.map((c) => (
                        <Link key={c.label} href={c.href} className="cat-link">
                            {c.label}
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}
