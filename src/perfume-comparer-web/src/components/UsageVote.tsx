"use client";

import { useState } from "react";
import Icon from "./Icon";
import { API_BASE } from "@/lib/urls";
import { useAuth } from "@/lib/stores";
import { useLocalState } from "@/lib/clientStore";

export interface AgeGroupScore {
    name: string;
    slug: string;
    score: number;
    votes: number;
}

/** Yaş grupları API'deki AgeGroup enum'ıyla aynı slug'ları kullanır. */
const AGE_GROUPS = [
    { slug: "genc", label: "16-25" },
    { slug: "orta-yas", label: "26-45" },
    { slug: "olgun", label: "46+" },
    { slug: "diger", label: "Belirtmek istemiyorum" },
];

/**
 * "Bu parfümü kullanıyorum" butonu. Yaş grubu dağılımının tek veri kaynağı budur:
 * kaynak sitede böyle bir bilgi yok, tamamen buradan birikiyor.
 */
export default function UsageVote({
    slug,
    usageCount,
    onVoted,
}: {
    slug: string;
    usageCount: number;
    onVoted: (result: { usageCount: number; ageGroups: AgeGroupScore[] }) => void;
}) {
    const { token } = useAuth();
    const [voted, setVoted, ready] = useLocalState<Record<string, string>>("usage-votes", {});
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const myChoice = voted[slug];

    const submit = async (ageGroup: string) => {
        setSending(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/api/perfumes/${slug}/kullaniyorum`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ ageGroup }),
            });
            if (!res.ok) throw new Error("kayit");
            onVoted(await res.json());
            setVoted((prev) => ({ ...prev, [slug]: ageGroup }));
            setOpen(false);
        } catch {
            setError("Kaydedilemedi. Lütfen tekrar deneyin.");
        } finally {
            setSending(false);
        }
    };

    if (!ready) return null;

    return (
        <div className="usage-vote">
            <button
                className={`btn ${myChoice ? "btn-ghost" : "btn-primary"}`}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <Icon name={myChoice ? "check" : "plus"} size={14} />
                {myChoice ? "Kullanıyorum olarak işaretlendi" : "Bu parfümü kullanıyorum"}
            </button>

            {usageCount > 0 && (
                <span className="usage-count muted">{usageCount} kişi kullanıyor</span>
            )}

            {open && (
                <div className="usage-picker">
                    <p className="usage-picker-title">
                        {myChoice ? "Yaş aralığınızı güncelleyin:" : "Yaş aralığınız nedir?"}
                    </p>
                    <div className="chip-nav">
                        {AGE_GROUPS.map((g) => (
                            <button
                                key={g.slug}
                                className={`chip ${myChoice === g.slug ? "chip-active" : ""}`}
                                onClick={() => submit(g.slug)}
                                disabled={sending}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                    <p className="usage-picker-note muted">
                        Yaşınız yalnızca yaş grubu dağılımında toplu olarak gösterilir.
                    </p>
                    {error && <p className="form-note">{error}</p>}
                </div>
            )}
        </div>
    );
}
