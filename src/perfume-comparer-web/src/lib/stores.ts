"use client";

import { useCallback } from "react";
import { useLocalState } from "./clientStore";
import { API_BASE } from "./urls";

export interface PerfumeRef {
    slug: string;
    name: string;
    brandName: string;
    imageUrl?: string | null;
    path: string;
}

export type GenderPref = "male" | "female" | "all" | null;

export interface AuthUser {
    id: number;
    email: string;
    name?: string | null;
    picture?: string | null;
}

interface Session {
    token: string;
    user: AuthUser;
}

export const MAX_COMPARE = 4;

/** Cinsiyet tercihi: ilk ziyarette null → kullanıcıya sorulur, sonra saklanır. */
export function useGenderPref() {
    const [gender, setGender, ready] = useLocalState<GenderPref>("gender-pref", null);
    return { gender, setGender, ready };
}

export function useFavorites() {
    const [items, set, ready] = useLocalState<PerfumeRef[]>("favorites", []);
    const has = (slug: string) => items.some((i) => i.slug === slug);
    const toggle = (p: PerfumeRef) =>
        set((prev) => (prev.some((i) => i.slug === p.slug) ? prev.filter((i) => i.slug !== p.slug) : [...prev, p]));
    return { items, has, toggle, ready };
}

export function useCompare() {
    const [items, set, ready] = useLocalState<PerfumeRef[]>("compare-basket", []);
    const has = (slug: string) => items.some((i) => i.slug === slug);
    const isFull = items.length >= MAX_COMPARE;
    const toggle = (p: PerfumeRef) =>
        set((prev) => {
            if (prev.some((i) => i.slug === p.slug)) return prev.filter((i) => i.slug !== p.slug);
            if (prev.length >= MAX_COMPARE) return prev;
            return [...prev, p];
        });
    const remove = (slug: string) => set((prev) => prev.filter((i) => i.slug !== slug));
    const clear = () => set([]);
    return { items, has, isFull, toggle, remove, clear, ready };
}

/**
 * Kimlik doğrulama. Girişten sonra backend'den dönen { token, user } (yani
 * Google'ın claim'leri) localStorage'da tutulur; bileşenler bunu okur. Çıkışta
 * claim'ler silinir.
 *
 * - signInGoogle(credential): gerçek Google ID token'ı backend'de doğrulanır.
 * - signInDev(): gerçek Google olmadan mock Google claim'leri üretir (dev-only).
 */
export function useAuth() {
    const [session, setSession, ready] = useLocalState<Session | null>("auth-session", null);

    const signInGoogle = useCallback(
        async (credential: string): Promise<boolean> => {
            try {
                const res = await fetch(`${API_BASE}/api/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ credential }),
                });
                if (!res.ok) return false;
                setSession((await res.json()) as Session);
                return true;
            } catch {
                return false;
            }
        },
        [setSession],
    );

    const signInDev = useCallback(async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/dev-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            if (!res.ok) return false;
            setSession((await res.json()) as Session);
            return true;
        } catch {
            return false;
        }
    }, [setSession]);

    const signOut = useCallback(() => setSession(null), [setSession]);

    return {
        user: session?.user ?? null,
        token: session?.token ?? null,
        signInGoogle,
        signInDev,
        signOut,
        ready,
    };
}
