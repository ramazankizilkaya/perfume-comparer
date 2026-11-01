"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/stores";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GsiId {
    initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
}

// Google, initialize() her çağrıldığında uyarı verir. Bu yüzden bir kez çağrılır; düğme her
// çizildiğinde (giriş penceresi her açıldığında) yalnızca güncel geri çağrı değişir.
let initialized = false;
let onCredential: ((credential: string) => void) | null = null;

/**
 * Gerçek Google Identity Services butonu. NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * tanımlı değilse hiçbir şey çizmez; giriş penceresi bu durumda geliştirici
 * girişini gösterir.
 */
export default function GoogleSignIn({
    onSignedIn,
    onError,
}: {
    onSignedIn?: () => void;
    onError?: (message: string) => void;
}) {
    const { signInGoogle } = useAuth();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!CLIENT_ID) return;
        const gid = () => (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google?.accounts?.id;

        onCredential = async (credential) => {
            const ok = await signInGoogle(credential);
            if (ok) onSignedIn?.();
            else onError?.("Google ile giriş yapılamadı. Lütfen tekrar deneyin.");
        };

        const render = () => {
            const id = gid();
            if (!id || !ref.current) return;
            if (!initialized) {
                id.initialize({ client_id: CLIENT_ID, callback: (r) => onCredential?.(r.credential) });
                initialized = true;
            }
            id.renderButton(ref.current, { theme: "outline", size: "large", text: "signin_with", locale: "tr", width: 260 });
        };

        if (gid()) {
            render();
        } else {
            const existing = document.getElementById("gsi-client");
            if (existing) {
                existing.addEventListener("load", render);
            } else {
                const s = document.createElement("script");
                s.id = "gsi-client";
                s.src = "https://accounts.google.com/gsi/client";
                s.async = true;
                s.defer = true;
                s.onload = render;
                document.body.appendChild(s);
            }
        }

        return () => {
            onCredential = null;
        };
    }, [signInGoogle, onSignedIn, onError]);

    if (!CLIENT_ID) return null;

    return <div ref={ref} />;
}

export const googleConfigured = !!CLIENT_ID;
