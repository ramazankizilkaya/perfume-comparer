"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import { useGenderPref } from "@/lib/stores";

const GENDER_OPTIONS: { key: "erkek" | "kadin" | "unisex"; label: string; ico: string }[] = [
    { key: "erkek", label: "Erkek", ico: "♂" },
    { key: "kadin", label: "Kadın", ico: "♀" },
    { key: "unisex", label: "Unisex", ico: "⚥" },
];

/** Düğmede seçili cinsiyetlerin simgeleri yan yana durur; hiçbiri ya da üçü seçiliyse tek simge ("Hepsi") görünür. */
function getButtonMeta(selected: string[]) {
    if (selected.length === 0 || selected.length === 3) {
        return { icos: ["⚥"], label: "Hepsi" };
    }
    const labels = selected.map((k) => (k === "erkek" ? "Erkek" : k === "kadin" ? "Kadın" : "Unisex"));
    const icos = selected.map((k) => (k === "erkek" ? "♂" : k === "kadin" ? "♀" : "⚥"));
    return { icos, label: labels.join(", ") };
}

/** Mobilde cinsiyet tercihi başlıktaki düğme yerine hamburger menünün içinde çoklu seçimle yapılır. */
export function MobileGenderOptions() {
    const { selectedGenders, toggleGender } = useGenderPref();

    return (
        <div className="mobile-menu-group" role="group" aria-label="Cinsiyet Tercihi">
            <div className="mobile-menu-group-head">
                <span className="mobile-menu-group-title">Cinsiyet Tercihi</span>
            </div>
            <div className="mobile-gender-chips">
                {GENDER_OPTIONS.map((o) => {
                    const isChecked = selectedGenders.includes(o.key);
                    return (
                        <button
                            key={o.key}
                            type="button"
                            className={`mobile-gender-opt${isChecked ? " on" : ""}`}
                            aria-pressed={isChecked}
                            onClick={() => toggleGender(o.key)}
                        >
                            <span className="gender-ico">{o.ico}</span>
                            <span>{o.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function GenderControl() {
    const { selectedGenders, toggleGender } = useGenderPref();
    const [open, setOpen] = useState(false);
    const [flash, setFlash] = useState(false);

    const boxRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    const flashButton = () => {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 1500);
    };

    const cur = getButtonMeta(selectedGenders);

    return (
        <div className="gender-control" ref={boxRef}>
            <button
                ref={btnRef}
                className={`icon-btn gender-btn${flash ? " flash" : ""}`}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={`Cinsiyet tercihi: ${cur.label}`}
                data-tooltip={`Cinsiyet: ${cur.label}`}
            >
                <span className={`gender-ico${cur.icos.length > 1 ? " gender-ico-multi" : ""}`}>
                    {cur.icos.map((ico, i) => (
                        <span key={i}>{ico}</span>
                    ))}
                </span>
            </button>

            {open && (
                <div className="gender-menu" role="dialog" aria-label="Cinsiyet Filtresi">
                    <div className="gender-menu-header">
                        <span className="gender-menu-title">Cinsiyet Tercihi</span>
                    </div>
                    <div className="gender-options-list">
                        {GENDER_OPTIONS.map((o) => {
                            const isChecked = selectedGenders.includes(o.key);
                            return (
                                <label
                                    key={o.key}
                                    className={`gender-opt ${isChecked ? "on" : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                            toggleGender(o.key);
                                            flashButton();
                                        }}
                                        className="gender-checkbox"
                                    />
                                    <span className="gender-ico">{o.ico}</span>
                                    <span className="gender-opt-text">{o.label}</span>
                                    {isChecked && <Icon name="check" size={13} className="gender-check" />}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
