"use client";

import { useEffect, useState } from "react";
import { loadScript } from "@/lib/loadScript";
import { useAuth } from "@/lib/stores";

const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const SDK_URL = "https://connect.facebook.net/tr_TR/sdk.js";

interface FacebookSdk {
    init: (o: { appId: string; version: string; cookie: boolean; xfbml: boolean }) => void;
    login: (cb: (r: { authResponse?: { accessToken: string } | null }) => void, o: { scope: string }) => void;
}

const facebookSdk = () => (window as unknown as { FB?: FacebookSdk }).FB;

/**
 * "Facebook ile giriş yap" düğmesi. NEXT_PUBLIC_FACEBOOK_APP_ID tanımlı değilse hiçbir şey
 * çizmez. Facebook erişim jetonu verir; backend jetonu Graph API ile doğrular.
 */
export default function FacebookSignIn({
    onSignedIn,
    onError,
}: {
    onSignedIn?: () => void;
    onError?: (message: string) => void;
}) {
    const { signInFacebook } = useAuth();
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!APP_ID) return;
        let cancelled = false;
        loadScript("facebook-signin-sdk", SDK_URL)
            .then(() => {
                const fb = facebookSdk();
                if (!fb || cancelled) return;
                fb.init({ appId: APP_ID, version: "v23.0", cookie: false, xfbml: false });
                setReady(true);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    if (!APP_ID) return null;

    function click() {
        const fb = facebookSdk();
        if (!fb || busy) return;
        setBusy(true);
        // Açılır pencere, tıklamanın hemen içinde açılmalı; bu yüzden login() burada eşzamanlı çağrılır.
        fb.login(
            (r) => {
                const token = r.authResponse?.accessToken;
                if (!token) {
                    setBusy(false);
                    return;
                }
                signInFacebook(token).then((ok) => {
                    setBusy(false);
                    if (ok) onSignedIn?.();
                    else onError?.("Facebook ile giriş yapılamadı. Lütfen tekrar deneyin.");
                });
            },
            { scope: "public_profile,email" },
        );
    }

    return (
        <button type="button" className="social-btn social-btn-facebook" disabled={!ready || busy} onClick={click}>
            <svg className="social-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                    fill="currentColor"
                    d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.24-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.28 4.3c-2.3 0-3.88 1.4-3.88 3.98v2.22H7.8v3h2.6V21h3.1Z"
                />
            </svg>
            Facebook ile giriş yap
        </button>
    );
}

export const facebookConfigured = !!APP_ID;
