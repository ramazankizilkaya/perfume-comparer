"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { brandHref, mediaUrl } from "@/lib/urls";

export interface BrandCard {
    id: number;
    name: string;
    slug: string;
    logoUrl?: string | null;
    country?: string | null;
    perfumeCount: number;
}

export default function BrandsFilterClient({ initialBrands }: { initialBrands: BrandCard[] }) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const term = query.trim().toLocaleLowerCase("tr");
        if (!term) return initialBrands;
        return initialBrands.filter((b) => b.name.toLocaleLowerCase("tr").includes(term));
    }, [initialBrands, query]);

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

            {groups.length === 0 ? (
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

function BrandTile({ brand }: { brand: BrandCard }) {
    const logo = mediaUrl(brand.logoUrl);
    return (
        <Link
            href={brandHref(brand.slug)}
            className="brand-card"
            title={`${brand.name} (${brand.perfumeCount} parfüm)`}
            aria-label={`${brand.name} parfümleri (${brand.perfumeCount} adet)`}
        >
            <div className="brand-card-logo">
                {logo ? (
                    <img src={logo} alt="" loading="lazy" />
                ) : (
                    <span className="brand-card-fallback">{brand.name}</span>
                )}
            </div>
            <span className="brand-card-name">{brand.name}</span>
            <span className="brand-card-count">{brand.perfumeCount}</span>
        </Link>
    );
}
