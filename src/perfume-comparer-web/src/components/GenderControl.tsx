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
    const { gender, setGender, ready } = useGenderPref();
    const [open, setOpen] = useState(false);
    const [ask, setAsk] = useState(false);
    const [fly, setFly] = useState<{ dx: number; dy: number } | null>(null);
    const [chosen, setChosen] = useState<GenderPref>(null);
    const [flash, setFlash] = useState(false);

    const boxRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // İlk ziyaret: tercih yoksa sor.
    useEffect(() => {
        if (ready && gender === null) setAsk(true);
    }, [ready, gender]);

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

    // İlk popup'tan seçim: popup sağ üstteki kontrole doğru uçar, sonra kontrol flash'lar.
    const chooseFromModal = (g: GenderPref) => {
        if (fly) return;

        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const modalEl = modalRef.current;
        const btnEl = btnRef.current;

        if (reduce || !modalEl || !btnEl) {
            setGender(g);
            setAsk(false);
            flashButton();
            return;
        }

        const m = modalEl.getBoundingClientRect();
        const b = btnEl.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (m.left + m.width / 2);
        const dy = b.top + b.height / 2 - (m.top + m.height / 2);

        setChosen(g);
        setFly({ dx, dy });

        window.setTimeout(() => {
            setGender(g); // kalıcı yaz
            setAsk(false);
            setFly(null);
            setChosen(null);
            flashButton(); // kontrol dikkat çeksin
        }, 620);
    };

    const cur = opt(gender);

    return (
        <>
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

            {ask && (
                <div className={`modal-scrim${fly ? " dismissing" : ""}`}>
                    <div
                        ref={modalRef}
                        className={`modal gender-modal${fly ? " flying" : ""}`}
                        style={fly ? { transform: `translate(${fly.dx}px, ${fly.dy}px) scale(0.14)`, opacity: 0 } : undefined}
                    >
                        <h2 className="gender-modal-title">Kimin için parfüm arıyorsunuz?</h2>
                        <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
                            Size en uygun parfümleri gösterelim. Bu tercihi üst menüden istediğiniz zaman
                            değiştirebilirsiniz.
                        </p>
                        <div className="gender-choices">
                            {OPTS.map((o) => (
                                <button
                                    key={o.key}
                                    className={`gender-choice${chosen === o.key ? " chosen" : ""}`}
                                    onClick={() => chooseFromModal(o.key)}
                                >
                                    <span className="gender-choice-ico">{o.ico}</span>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
