"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Icon, { type IconName } from "./Icon";
import { GENDER_PROMPT_LABEL } from "./GenderControl";
import DarkModeSwitch from "./DarkModeSwitch";
import { openGenderPrompt } from "@/lib/genderPrompt";
import { useAuth, type AuthUser } from "@/lib/stores";
import { openLogin } from "@/lib/loginModal";
import { searchHref, myBlogsHref } from "@/lib/urls";

const ACCOUNT_LINKS: { label: string; icon: IconName; href: string }[] = [
    { label: "Favorilerim", icon: "heart", href: searchHref({ userFilter: "favorites" }) },
    { label: "Yorum Yazdıklarım", icon: "message", href: searchHref({ userFilter: "comments" }) },
    { label: "Puanladıklarım", icon: "star", href: searchHref({ userFilter: "ratings" }) },
    { label: "Yazılarım", icon: "edit", href: myBlogsHref() },
];

function initials(u: AuthUser): string {
    const src = (u.name || u.email || "?").trim();
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLocaleUpperCase("tr");
    return src.slice(0, 2).toLocaleUpperCase("tr");
}

function hue(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
}

function Avatar({ user, size = 30 }: { user: AuthUser; size?: number }) {
    if (user.picture) {
        return <img className="avatar" src={user.picture} alt={user.name || "Kullanıcı profili"} width={size} height={size} referrerPolicy="no-referrer" />;
    }
    const h = hue(user.name || user.email);
    return (
        <span
            className="avatar avatar-initials"
            style={{ width: size, height: size, background: `hsl(${h} 45% 42%)`, fontSize: size * 0.42 }}
            aria-hidden="true"
        >
            {initials(user)}
        </span>
    );
}

/** Mobilde hesap seçenekleri başlıktaki düğme yerine hamburger menünün içinde listelenir. */
export function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
    const { user, signOut, ready } = useAuth();

    if (!ready || !user) {
        return (
            <>
                <button
                    type="button"
                    className="mobile-nav-link mobile-login-link"
                    onClick={() => {
                        onNavigate();
                        openLogin();
                    }}
                >
                    <Icon name="user" size={16} />
                    <span>Giriş Yap</span>
                </button>
                <Link href={ACCOUNT_LINKS[0].href} className="mobile-nav-link" onClick={onNavigate}>
                    <Icon name="heart" size={16} />
                    <span>{ACCOUNT_LINKS[0].label}</span>
                </Link>
            </>
        );
    }

    return (
        <>
            <div className="mobile-account-card">
                <Avatar user={user} size={36} />
                <div className="user-info-text">
                    <strong>{user.name || "Kullanıcı"}</strong>
                    <span>{user.email}</span>
                </div>
            </div>
            {ACCOUNT_LINKS.map((l) => (
                <Link key={l.label} href={l.href} className="mobile-nav-link" onClick={onNavigate}>
                    <Icon name={l.icon} size={16} />
                    <span>{l.label}</span>
                </Link>
            ))}
            <button
                type="button"
                className="mobile-nav-link mobile-signout-btn"
                onClick={() => {
                    signOut();
                    onNavigate();
                }}
            >
                <Icon name="close" size={16} />
                <span>Çıkış yap</span>
            </button>
        </>
    );
}

export default function UserMenu() {
    const { user, signOut, ready } = useAuth();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    // Giriş yapılmamışsa buton menü açar: Giriş Yap, Favorilerim, anasayfa tercihi ve karanlık mod
    if (!ready || !user) {
        return (
            <div className="user-menu" ref={ref}>
                <button
                    type="button"
                    className="icon-btn login-btn"
                    onClick={() => setOpen((o) => !o)}
                    aria-label="Kullanıcı Menüsü"
                    aria-expanded={open}
                    data-tooltip="Giriş / Favoriler"
                >
                    <Icon name="user" size={17} />
                </button>

                {open && (
                    <div className="user-dropdown">
                        <nav className="user-dropdown-nav">
                            <button
                                type="button"
                                className="user-dropdown-link"
                                onClick={() => {
                                    setOpen(false);
                                    openLogin();
                                }}
                                style={{ fontWeight: 600, color: "var(--accent)" }}
                            >
                                <Icon name="user" size={15} />
                                <span>Giriş Yap</span>
                            </button>
                            <Link
                                href={searchHref({ userFilter: "favorites" })}
                                className="user-dropdown-link"
                                onClick={() => setOpen(false)}
                            >
                                <Icon name="heart" size={15} />
                                <span>Favorilerim</span>
                            </Link>
                            <button
                                type="button"
                                className="user-dropdown-link"
                                onClick={() => {
                                    setOpen(false);
                                    openGenderPrompt();
                                }}
                            >
                                <Icon name="filter" size={15} />
                                <span>{GENDER_PROMPT_LABEL}</span>
                            </button>
                            <DarkModeSwitch className="user-dropdown-link" />
                        </nav>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="user-menu" ref={ref}>
            <button
                className="user-btn"
                onClick={() => setOpen((o) => !o)}
                aria-label="Hesap"
                aria-expanded={open}
                data-tooltip={user.name || user.email || "Hesabım"}
            >
                <Avatar user={user} />
            </button>

            {open && (
                <div className="user-dropdown">
                    <div className="user-info">
                        <Avatar user={user} size={40} />
                        <div className="user-info-text">
                            <strong>{user.name || "Kullanıcı"}</strong>
                            <span>{user.email}</span>
                        </div>
                    </div>
                    <nav className="user-dropdown-nav">
                        {ACCOUNT_LINKS.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                className="user-dropdown-link"
                                onClick={() => setOpen(false)}
                            >
                                <Icon name={l.icon} size={15} />
                                <span>{l.label}</span>
                            </Link>
                        ))}
                        <button
                            type="button"
                            className="user-dropdown-link"
                            onClick={() => {
                                setOpen(false);
                                openGenderPrompt();
                            }}
                        >
                            <Icon name="filter" size={15} />
                            <span>{GENDER_PROMPT_LABEL}</span>
                        </button>
                        <DarkModeSwitch className="user-dropdown-link" />
                    </nav>
                    <button className="user-signout" onClick={() => { signOut(); setOpen(false); }}>
                        Çıkış yap
                    </button>
                </div>
            )}
        </div>
    );
}
