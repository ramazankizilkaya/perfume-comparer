"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import { useGenderPref, type GenderPref } from "@/lib/stores";

const OPTS: { key: Exclude<GenderPref, null>; label: string; ico: string }[] = [
    { key: "male", label: "Erkek", ico: "♂" },
    { key: "female", label: "Kadın", ico: "♀" },
    { key: "all", label: "Hepsi", ico: "⚥" },
];

function opt(g: GenderPref) {
    return OPTS.find((o) => o.key === g) ?? OPTS[2];
}

export default function GenderControl() {
    const { gender, setGender } = useGenderPref();
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

    // Dropdown'dan (sonradan) seçim: animasyonsuz.
    const pick = (g: GenderPref) => {
        setGender(g);
        setOpen(false);
        flashButton();
    };

    const cur = opt(gender);

    return (
        <div className="gender-control" ref={boxRef}>
            <button
                ref={btnRef}
                className={`gender-btn${flash ? " flash" : ""}`}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Cinsiyet tercihi"
            >
                <span className="gender-ico">{cur.ico}</span>
                <span className="gender-lbl">{cur.label}</span>
                <Icon name="chevron-down" size={12} />
            </button>

            {open && (
                <div className="gender-menu" role="menu">
                    {OPTS.map((o) => (
                        <button
                            key={o.key}
                            role="menuitemradio"
                            aria-checked={gender === o.key}
                            className={`gender-opt ${gender === o.key ? "on" : ""}`}
                            onClick={() => pick(o.key)}
                        >
                            <span className="gender-ico">{o.ico}</span>
                            {o.label}
                            {gender === o.key && <Icon name="check" size={13} className="gender-check" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
