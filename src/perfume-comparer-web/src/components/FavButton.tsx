"use client";

import Icon from "./Icon";
import { useFavorites, useAuth, authFetch, type PerfumeRef } from "@/lib/stores";
import { API_BASE } from "@/lib/urls";
import { toast } from "@/lib/toast";

export default function FavButton({ perfume, className }: { perfume: PerfumeRef; className?: string }) {
    const { has, toggle, setPresent, ready } = useFavorites();
    const { token } = useAuth();
    const active = ready && has(perfume.slug);

    return (
        <button
            type="button"
            className={`fav-btn ${active ? "on" : ""} ${className ?? ""}`}
            title={active ? "Favorilerden çıkar" : "Favorilere ekle"}
            aria-pressed={active}
            aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(perfume);
                if (token) {
                    // authFetch zorunlu X-Requested-With ve Authorization başlıklarını ekler.
                    // Sunucunun kesin cevabı ("favorited") yerel listeye yazılır; hata olursa geri alınır.
                    authFetch(`${API_BASE}/api/perfumes/${perfume.slug}/favorite`, { method: "POST" })
                        .then(async (res) => {
                            if (!res.ok) throw new Error("favori");
                            const data = (await res.json().catch(() => ({}))) as { favorited?: boolean };
                            if (typeof data.favorited === "boolean") setPresent(perfume, data.favorited);
                        })
                        .catch(() => {
                            setPresent(perfume, active);
                            toast.error("Favori kaydedilemedi. Lütfen tekrar deneyin.");
                        });
                }
            }}
        >
            <Icon name="heart" filled={active} size={16} />
        </button>
    );
}
