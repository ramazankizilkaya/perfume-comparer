"use client";

import Icon from "./Icon";
import { useFavorites, useAuth, type PerfumeRef } from "@/lib/stores";
import { API_BASE } from "@/lib/urls";

export default function FavButton({ perfume, className }: { perfume: PerfumeRef; className?: string }) {
    const { has, toggle, ready } = useFavorites();
    const { token } = useAuth();
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
                if (token) {
                    fetch(`${API_BASE}/api/perfumes/${perfume.slug}/favorite`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                    }).catch(() => { /* offline / ignore */ });
                }
            }}
        >
            <Icon name="heart" filled={active} size={16} />
        </button>
    );
}
