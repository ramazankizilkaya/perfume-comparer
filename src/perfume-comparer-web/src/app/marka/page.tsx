"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { API_BASE, brandHref, mediaUrl } from "@/lib/urls";

interface BrandCard {
    id: number;
    name: string;
    slug: string;
    logoUrl?: string | null;
    country?: string | null;
    perfumeCount: number;
}

export default function BrandsPage() {
    const [brands, setBrands] = useState<BrandCard[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/brands`);
                if (res.ok) setBrands(await res.json());
            } catch {
                setBrands([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        const term = query.trim().toLocaleLowerCase("tr");
        if (!term) return brands;
        return brands.filter((b) => b.name.toLocaleLowerCase("tr").includes(term));
    }, [brands, query]);

    // Baş harfe göre grupla; uzun listede göz taraması kolaylaşsın.
    const groups = useMemo(() => {
        const map = new Map<string, BrandCard[]>();
        for (const brand of filtered) {
            const letter = brand.name.charAt(0).toLocaleUpperCase("tr");
            const key = /[0-9]/.test(letter) ? "#" : letter;
            const bucket = map.get(key);
            if (bucket) bucket.push(brand);
            else map.set(key, [brand]);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));
    }, [filtered]);

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Markalar" }]} />

            <header style={{ marginBottom: "1rem" }}>
                <span className="eyebrow">Marka rehberi</span>
                <h1 className="page-title">Tüm markalar</h1>
            </header>

            <div className="field" style={{ marginBottom: "1.25rem" }}>
                <Icon name="search" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Marka ara… (ör. chanel)"
                    aria-label="Marka ara"
                />
                {query && (
                    <button onClick={() => setQuery("")} aria-label="Temizle">
                        <Icon name="close" size={14} />
                    </button>
                )}
            </div>

            {loading ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : groups.length === 0 ? (
                <p className="empty">Aramanıza uyan marka bulunamadı.</p>
            ) : (
                groups.map(([letter, items]) => (
                    <section key={letter} className="brand-group">
                        <h2 className="brand-group-letter">{letter}</h2>
                        <div className="brand-card-grid">
                            {items.map((b) => (
                                <BrandTile key={b.slug} brand={b} />
                            ))}
                        </div>
                    </section>
                ))
            )}
        </>
    );
}

/**
 * Kartın içinde sadece logo var. Markanın adı ekranda yazmadığı için
 * bağlantıya `aria-label` ve `title` veriyoruz: ekran okuyucu okuyabilsin,
 * fareyle üstüne gelen de hangi marka olduğunu görebilsin.
 */
function BrandTile({ brand }: { brand: BrandCard }) {
    return (
        <Link
            href={brandHref(brand.slug)}
            className="brand-card"
            aria-label={brand.name}
            title={`${brand.name} · ${brand.perfumeCount} parfüm`}
        >
            {brand.logoUrl ? (
                <img className="brand-card-logo" src={mediaUrl(brand.logoUrl)} alt={brand.name} loading="lazy" />
            ) : (
                <span className="brand-card-fallback">{brand.name}</span>
            )}
        </Link>
    );
}
