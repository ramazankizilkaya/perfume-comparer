"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { API_BASE, mediaUrl } from "@/lib/urls";

export interface PickedPerfume {
    slug: string;
    name: string;
    brandName: string;
    imageUrl?: string | null;
}

interface Suggestion {
    slug: string;
    name: string;
    brandName: string;
    imageUrl?: string | null;
}

/**
 * Parfüm arayıp seçtiren otomatik tamamlama alanı. Seçilenler rozet olarak
 * altta listelenir; dışarıya sadece slug listesi lazım olduğu için üst bileşen
 * tam nesneyi tutup gönderirken slug'a indirger.
 */
export default function PerfumePicker({
    label,
    placeholder,
    excludeSlug,
    selected,
    onChange,
    max = 5,
}: {
    label: string;
    placeholder: string;
    excludeSlug?: string;
    selected: PickedPerfume[];
    onChange: (next: PickedPerfume[]) => void;
    max?: number;
}) {
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    const term = query.trim();

    useEffect(() => {
        // Kısa terimde istek atma; liste zaten türetilirken boşaltılıyor, böylece
        // effect gövdesinde senkron setState çağrısı olmuyor.
        if (term.length < 2) return;

        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/search/autocomplete?q=${encodeURIComponent(term)}`);
                if (res.ok) {
                    const data = await res.json();
                    setItems((data.perfumes ?? []).slice(0, 8));
                    setOpen(true);
                }
            } catch {
                setItems([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => clearTimeout(t);
    }, [term]);

    // Dışarı tıklayınca öneri listesi kapansın.
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const add = (s: Suggestion) => {
        if (selected.length >= max) return;
        if (selected.some((p) => p.slug === s.slug)) return;
        onChange([...selected, { slug: s.slug, name: s.name, brandName: s.brandName, imageUrl: s.imageUrl }]);
        setQuery("");
        setItems([]);
        setOpen(false);
    };

    const remove = (slug: string) => onChange(selected.filter((p) => p.slug !== slug));

    const suggestions = term.length < 2
        ? []
        : items.filter((s) => s.slug !== excludeSlug && !selected.some((p) => p.slug === s.slug));

    const full = selected.length >= max;

    return (
        <div className="perfume-picker" ref={boxRef}>
            <label className="review-section-title">{label}</label>

            <div className="picker-field">
                <Icon name="search" size={14} />
                <input
                    type="text"
                    value={query}
                    disabled={full}
                    placeholder={full ? `En fazla ${max} parfüm seçebilirsiniz` : placeholder}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    aria-label={label}
                />
                {loading && <span className="picker-spinner" aria-hidden="true" />}
            </div>

            {open && suggestions.length > 0 && (
                <ul className="picker-list">
                    {suggestions.map((s) => (
                        <li key={s.slug}>
                            <button type="button" onClick={() => add(s)}>
                                {s.imageUrl && <img src={mediaUrl(s.imageUrl)} alt="" loading="lazy" />}
                                <span className="picker-item-text">
                                    <span className="picker-item-brand">{s.brandName}</span>
                                    <span className="picker-item-name">{s.name}</span>
                                </span>
                                <Icon name="plus" size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {selected.length > 0 && (
                <div className="picker-chips">
                    {selected.map((p) => (
                        <span key={p.slug} className="picker-chip">
                            {p.brandName} {p.name}
                            <button type="button" onClick={() => remove(p.slug)} aria-label={`${p.name} kaldır`}>
                                <Icon name="close" size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
