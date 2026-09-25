"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { useAuth, type AuthUser } from "@/lib/stores";

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

export default function UserMenu() {
    const { user, signOut, ready } = useAuth();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    const next = pathname && pathname !== "/giris" ? `?next=${encodeURIComponent(pathname)}` : "";

    // Giriş yapılmamışsa buton menü açar: Favorilerim ve Giriş Yap
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
                    <div className="user-dropdown" role="menu">
                        <nav className="user-dropdown-nav" style={{ borderBlockEnd: "none" }}>
                            <Link
                                href="/tr/detayli-arama?userFilter=favorites"
                                className="user-dropdown-link"
                                onClick={() => setOpen(false)}
                            >
                                <Icon name="heart" size={15} />
                                <span>Favorilerim</span>
                            </Link>
                            <Link
                                href={`/giris${next}`}
                                className="user-dropdown-link"
                                onClick={() => setOpen(false)}
                                style={{ fontWeight: 600, color: "var(--accent)" }}
                            >
                                <Icon name="user" size={15} />
                                <span>Giriş Yap</span>
                            </Link>
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
                <div className="user-dropdown" role="menu">
                    <div className="user-info">
                        <Avatar user={user} size={40} />
                        <div className="user-info-text">
                            <strong>{user.name || "Kullanıcı"}</strong>
                            <span>{user.email}</span>
                        </div>
                    </div>
                    <nav className="user-dropdown-nav">
                        <Link
                            href="/tr/detayli-arama?userFilter=favorites"
                            className="user-dropdown-link"
                            onClick={() => setOpen(false)}
                        >
                            <Icon name="heart" size={15} />
                            <span>Favorilerim</span>
                        </Link>
                        <Link
                            href="/tr/detayli-arama?userFilter=comments"
                            className="user-dropdown-link"
                            onClick={() => setOpen(false)}
                        >
                            <Icon name="message" size={15} />
                            <span>Yorum Yazdıklarım</span>
                        </Link>
                        <Link
                            href="/tr/detayli-arama?userFilter=ratings"
                            className="user-dropdown-link"
                            onClick={() => setOpen(false)}
                        >
                            <Icon name="star" size={15} />
                            <span>Puanladıklarım</span>
                        </Link>
                        <Link
                            href="/blog/yazilarim"
                            className="user-dropdown-link"
                            onClick={() => setOpen(false)}
                        >
                            <Icon name="edit" size={15} />
                            <span>Yazılarım</span>
                        </Link>
                    </nav>
                    <button className="user-signout" onClick={() => { signOut(); setOpen(false); }}>
                        Çıkış yap
                    </button>
                </div>
            )}
        </div>
    );
}
