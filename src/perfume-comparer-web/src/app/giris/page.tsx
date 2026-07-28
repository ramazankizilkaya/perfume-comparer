"use client";

import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleSignIn, { googleConfigured } from "@/components/GoogleSignIn";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { useAuth } from "@/lib/stores";

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

    const next = params.get("next") || "/";

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

                        <button
                            type="button"
                            className="dev-login-btn"
                            disabled={busy}
                            onClick={async () => {
                                setBusy(true);
                                const ok = await signInDev();
                                setBusy(false);
                                if (ok) done();
                            }}
                        >
                            {busy ? "Giriş yapılıyor…" : "Geliştirici girişi (mock)"}
                        </button>

                        {!googleConfigured && (
                            <p className="faint" style={{ fontSize: "var(--fs-xs)" }}>
                                Gerçek Google girişi için <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> tanımlı olmalı.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
