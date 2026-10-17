"use client";

import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleSignIn, { googleConfigured } from "@/components/GoogleSignIn";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { useAuth } from "@/lib/stores";
import { localeHref } from "@/lib/urls";

/** Geliştirici (mock) girişi yalnızca geliştirme ortamında vardır; canlıda API de bu ucu kapatır. */
const DEV_LOGIN_ENABLED = process.env.NODE_ENV !== "production";

/**
 * ?next= yalnızca site içi bir yol olabilir. "//evil.com", "/\\evil.com" veya tam adresler
 * dış siteye yönlendirme (open redirect) açığı oluşturur; bunlar anasayfaya düşer.
 */
function safeNext(raw: string | null): string {
    const fallback = localeHref("/");
    if (!raw) return fallback;
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.includes("\\")) return fallback;
    return raw;
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>}>
            <LoginInner />
        </Suspense>
    );
}

function LoginInner() {
    const router = useRouter();
    const params = useSearchParams();
    const { user, signInDev, signOut, ready } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const next = safeNext(params.get("next"));

    const done = useCallback(() => {
        router.replace(next);
    }, [router, next]);

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Giriş yap" }]} />

            <div className="login-card">
                <h1 className="page-title">Giriş yap</h1>
                <p className="section-desc">
                    Yorum yapmak ve puan vermek için Google hesabınızla giriş yapın.
                </p>

                {!ready ? (
                    <div className="spinner" />
                ) : user ? (
                    <div className="login-signed-in">
                        <p>
                            <strong>{user.name || user.email}</strong> olarak giriş yaptınız.
                        </p>
                        <div className="login-actions">
                            <Link href={next} className="btn btn-primary">
                                Devam et
                            </Link>
                            <button className="btn btn-ghost" onClick={signOut}>
                                Çıkış yap
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="login-actions-col">
                        <GoogleSignIn onSignedIn={done} />

                        {!googleConfigured && !DEV_LOGIN_ENABLED && (
                            <p className="form-note err">Google girişi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.</p>
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
                                        if (ok) done();
                                        else setError("Geliştirici girişi başarısız oldu. API'nin çalıştığından emin olun.");
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
                )}
            </div>
        </>
    );
}
