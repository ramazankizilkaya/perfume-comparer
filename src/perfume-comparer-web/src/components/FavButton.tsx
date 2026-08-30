"use client";

import Icon from "./Icon";
import { useFavorites, type PerfumeRef } from "@/lib/stores";

export default function FavButton({ perfume, className }: { perfume: PerfumeRef; className?: string }) {
    const { has, toggle, ready } = useFavorites();
    const active = ready && has(perfume.slug);

    return (
        <button
            type="button"
            className={`fav-btn has-tooltip ${active ? "on" : ""} ${className ?? ""}`}
            data-tooltip={active ? "Favorilerden çıkar" : "Favorilere ekle"}
            aria-pressed={active}
            aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(perfume);
            }}
        >
            <Icon name="heart" filled={active} size={16} />
        </button>
    );
}
