"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FacebookSignIn, { facebookConfigured } from "./FacebookSignIn";
import GoogleSignIn, { googleConfigured } from "./GoogleSignIn";
import Icon from "./Icon";
import { closeLogin, useLoginModalOpen } from "@/lib/loginModal";
import { useAuth } from "@/lib/stores";
import { privacyHref } from "@/lib/urls";

/** Geliştirici (mock) girişi yalnızca geliştirme ortamında vardır; canlıda API de bu ucu kapatır. */
const DEV_LOGIN_ENABLED = process.env.NODE_ENV !== "production";

const anyProviderConfigured = googleConfigured || facebookConfigured;

/**
 * Sitenin tek giriş penceresi. Layout'ta bir kez durur; openLogin() ile her yerden açılır.
 * Giriş ayrı bir sayfa değildir, kullanıcı bulunduğu sayfada kalır.
 */
export default function LoginModal() {
    const open = useLoginModalOpen();
    return open ? <LoginDialog /> : null;
}

function LoginDialog() {
    const { user, signInDev } = useAuth();
    const pathname = usePathname();
    const cardRef = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Giriş tamamlanınca (hangi sağlayıcıyla olursa olsun) pencere kapanır.
    useEffect(() => {
        if (user) closeLogin();
    }, [user]);

    // Pencere açıkken başka bir sayfaya geçilirse (ör. gizlilik linki) kapanır.
    const firstPath = useRef(pathname);
    useEffect(() => {
        if (pathname !== firstPath.current) closeLogin();
    }, [pathname]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        cardRef.current?.focus();

        // Yakalama aşamasında dinlenir: altta açık başka bir pencere (ör. parfüm danışmanı)
        // aynı Esc tuşuyla kapanmasın.
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            closeLogin();
        };
        window.addEventListener("keydown", onKeyDown, true);

        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    return (
        <div
            className="review-modal-overlay login-modal-overlay"
            onClick={closeLogin}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
        >
            <div
                className="review-modal-card login-modal-card"
                ref={cardRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="review-modal-head">
                    <div>
                        <span className="eyebrow">Hesabınız</span>
                        <h2 className="modal-title" id="login-modal-title">Giriş yap</h2>
                    </div>
                    <button type="button" className="icon-btn" onClick={closeLogin} aria-label="Kapat">
                        <Icon name="close" size={16} />
                    </button>
                </div>

                <div className="login-modal-body">
                    <p className="section-desc">Yorum yapmak ve puan vermek için hesabınızla giriş yapın.</p>

                    <div className="login-actions-col">
                        <GoogleSignIn onError={setError} />
                        <FacebookSignIn onError={setError} />

                        {!anyProviderConfigured && !DEV_LOGIN_ENABLED && (
                            <p className="form-note err">Giriş şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.</p>
                        )}

                        {DEV_LOGIN_ENABLED && (
                            <>
                                <button
                                    type="button"
                                    className="dev-login-btn"
                                    disabled={busy}
                                    onClick={async () => {
                                        setBusy(true);
                                        setError(null);
                                        const ok = await signInDev();
                                        setBusy(false);
                                        if (!ok) setError("Geliştirici girişi başarısız oldu. API'nin çalıştığından emin olun.");
                                    }}
                                >
                                    {busy ? "Giriş yapılıyor…" : "Geliştirici girişi (mock)"}
                                </button>

                                {!googleConfigured && (
                                    <p className="faint" style={{ fontSize: "var(--fs-xs)" }}>
                                        Gerçek Google girişi için <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> tanımlı olmalı.
                                    </p>
                                )}
                            </>
                        )}

                        {error && <p className="form-note err">{error}</p>}
                    </div>

                    <p className="login-modal-note">
                        Giriş yaparak <Link href={privacyHref()}>gizlilik politikasını</Link> kabul etmiş olursunuz.
                    </p>
                </div>
            </div>
        </div>
    );
}
