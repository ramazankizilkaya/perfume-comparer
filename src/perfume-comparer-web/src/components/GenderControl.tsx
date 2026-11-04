"use client";

import { useEffect, useState } from "react";
import { useGenderPref } from "@/lib/stores";
import { closeGenderPrompt, useGenderPromptOpen } from "@/lib/genderPrompt";

type GenderKey = "erkek" | "kadin" | "unisex";

const GENDER_OPTIONS: { key: GenderKey; label: string; ico: string }[] = [
    { key: "erkek", label: "Erkek", ico: "♂" },
    { key: "kadin", label: "Kadın", ico: "♀" },
    { key: "unisex", label: "Unisex", ico: "⚥" },
];

/** Menülerdeki "Anasayfa Parfüm Tercihi" bağlantısının metni. */
export const GENDER_PROMPT_LABEL = "Anasayfa Parfüm Tercihi";

/**
 * Anasayfa parfüm tercihi penceresi. Layout'ta tek kez durur; anasayfa ilk ziyarette
 * (kayıtlı tercih yoksa), kullanıcı menüsü ve hamburger menü tıklanınca açar.
 * İlk ziyarette seçim yapılmadan kapatılamaz; sonradan açıldığında Esc ya da dışına tıklama kapatır.
 */
export function GenderPrompt() {
    const open = useGenderPromptOpen();
    const { ready, asked, selectedGenders, setGender } = useGenderPref();

    if (!open || !ready) return null;
    // Pencere her açılışta yeniden kurulur; böylece kayıtlı seçim işaretli başlar.
    return (
        <GenderPromptDialog
            initial={selectedGenders as GenderKey[]}
            dismissible={asked}
            onSave={(picked) => {
                // Hiçbiri ya da üçü birden seçiliyse tercih "Hepsi" olarak kaydedilir.
                setGender(picked.length > 0 ? picked.join(",") : null);
                closeGenderPrompt();
            }}
        />
    );
}

function GenderPromptDialog({
    initial,
    dismissible,
    onSave,
}: {
    initial: GenderKey[];
    dismissible: boolean;
    onSave: (picked: GenderKey[]) => void;
}) {
    const [picked, setPicked] = useState<GenderKey[]>(initial);

    useEffect(() => {
        if (!dismissible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeGenderPrompt();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [dismissible]);

    const toggle = (k: GenderKey) =>
        setPicked((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

    return (
        <div
            className="modal-scrim"
            onMouseDown={(e) => {
                if (dismissible && e.target === e.currentTarget) closeGenderPrompt();
            }}
        >
            <div className="modal gender-modal" role="dialog" aria-modal="true" aria-labelledby="gender-modal-title">
                <h2 id="gender-modal-title" className="gender-modal-title">Anasayfada hangi tür parfümleri görmek istersiniz?</h2>
                <p className="muted gender-modal-text">
                    Anasayfadaki listeler seçiminize göre dolar. Birden fazla seçim yapabilirsiniz. Bu tercihi
                    menüdeki &quot;{GENDER_PROMPT_LABEL}&quot; bağlantısından istediğiniz zaman değiştirebilirsiniz.
                </p>
                <div className="gender-choices">
                    {GENDER_OPTIONS.map((o) => {
                        const on = picked.includes(o.key);
                        return (
                            <button
                                key={o.key}
                                type="button"
                                className={`gender-choice${on ? " on" : ""}`}
                                aria-pressed={on}
                                onClick={() => toggle(o.key)}
                            >
                                <span className="gender-choice-ico">{o.ico}</span>
                                {o.label}
                            </button>
                        );
                    })}
                </div>
                <button type="button" className="btn btn-primary gender-modal-save" onClick={() => onSave(picked)}>
                    {picked.length === 0 ? "Hepsini Göster" : "Devam Et"}
                </button>
            </div>
        </div>
    );
}
