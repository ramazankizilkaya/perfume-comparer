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
    const { user } = useAuth();
    const pathname = usePathname();
    const cardRef = useRef<HTMLDivElement>(null);
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
                    <h2 className="modal-title" id="login-modal-title">Giriş yap</h2>
                    <button type="button" className="icon-btn" onClick={closeLogin} aria-label="Kapat">
                        <Icon name="close" size={16} />
                    </button>
                </div>

                <div className="login-modal-body">
                    <div className="login-actions-col">
                        <GoogleSignIn onError={setError} />
                        <FacebookSignIn onError={setError} />

                        {!anyProviderConfigured && (
                            <p className="form-note err">Giriş şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.</p>
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
