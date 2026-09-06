"use client";

import { useState, useMemo } from "react";
import Icon from "./Icon";
import BrandCard, { BrandCardData } from "./BrandCard";

export type { BrandCardData as BrandCard };

export default function BrandsFilterClient({ initialBrands }: { initialBrands: BrandCardData[] }) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const term = query.trim().toLocaleLowerCase("tr");
        if (!term) return initialBrands;
        return initialBrands.filter((b) => b.name.toLocaleLowerCase("tr").includes(term));
    }, [initialBrands, query]);

    const groups = useMemo(() => {
        const map = new Map<string, BrandCardData[]>();
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
                                <BrandCard key={b.slug} brand={b} />
                            ))}
                        </div>
                    </section>
                ))
            )}
        </>
    );
}
