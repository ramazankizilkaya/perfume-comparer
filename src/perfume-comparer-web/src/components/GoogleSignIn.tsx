"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/stores";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GsiId {
    initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
}

/**
 * Gerçek Google Identity Services butonu. NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * tanımlı değilse hiçbir şey çizmez; giriş sayfası bu durumda geliştirici
 * girişini gösterir.
 */
export default function GoogleSignIn({ onSignedIn }: { onSignedIn?: () => void }) {
    const { signInGoogle } = useAuth();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!CLIENT_ID) return;
        const gid = () => (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google?.accounts?.id;

        const render = () => {
            const id = gid();
            if (!id || !ref.current) return;
            id.initialize({
                client_id: CLIENT_ID,
                callback: async (r) => {
                    const ok = await signInGoogle(r.credential);
                    if (ok) onSignedIn?.();
                },
            });
            id.renderButton(ref.current, { theme: "outline", size: "large", text: "signin_with", locale: "tr", width: 260 });
        };

        if (gid()) { render(); return; }

        const existing = document.getElementById("gsi-client");
        if (existing) { existing.addEventListener("load", render); return; }

        const s = document.createElement("script");
        s.id = "gsi-client";
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = render;
        document.body.appendChild(s);
    }, [signInGoogle, onSignedIn]);

    if (!CLIENT_ID) return null;

    return <div ref={ref} />;
}

export const googleConfigured = !!CLIENT_ID;
