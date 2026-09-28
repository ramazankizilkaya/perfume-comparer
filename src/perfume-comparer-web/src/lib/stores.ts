"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useLocalState } from "./clientStore";
import { API_BASE } from "./urls";

export interface PerfumeRef {
    slug: string;
    name: string;
    brandName: string;
    imageUrl?: string | null;
    path: string;
}

export type GenderPref = string | null;

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

import { MAX_COMPARE } from "./constants";
export { MAX_COMPARE };

/** Cinsiyet tercihi: ilk ziyarette null (hepsi) → kullanıcı tek veya çoklu seçebilir ("erkek", "erkek,unisex", vb.). */
export function useGenderPref() {
    const [rawGender, setRawGender, ready] = useLocalState<string | null>("gender-pref", null);

    // Normalize legacy single strings ("male" -> "erkek", "female" -> "kadin") or comma lists
    const gender: string | null = useMemo(() => {
        if (!rawGender || rawGender === "all") return null;
        const parts = String(rawGender)
            .split(",")
            .map((p) => p.trim().toLowerCase())
            .map((p) => (p === "male" ? "erkek" : p === "female" ? "kadin" : p))
            .filter((p) => p === "erkek" || p === "kadin" || p === "unisex");
        if (parts.length === 0 || parts.length === 3) return null;
        return Array.from(new Set(parts)).join(",");
    }, [rawGender]);

    const selectedGenders: string[] = useMemo(() => {
        if (!gender) return [];
        return gender.split(",").filter(Boolean);
    }, [gender]);

    const setGender = useCallback((g: string | null) => {
        let norm: string | null = null;
        if (g && g !== "all") {
            const parts = String(g)
                .split(",")
                .map((p) => p.trim().toLowerCase())
                .map((p) => (p === "male" ? "erkek" : p === "female" ? "kadin" : p))
                .filter((p) => p === "erkek" || p === "kadin" || p === "unisex");
            if (parts.length > 0 && parts.length < 3) {
                norm = Array.from(new Set(parts)).join(",");
            }
        }
        setRawGender(norm);
        if (typeof document !== "undefined") {
            if (norm) {
                document.cookie = `gender-pref=${encodeURIComponent(JSON.stringify(norm))}; path=/; max-age=31536000; SameSite=Lax`;
            } else {
                document.cookie = `gender-pref=; path=/; max-age=0; SameSite=Lax`;
            }
        }
    }, [setRawGender]);

    const toggleGender = useCallback((target: "erkek" | "kadin" | "unisex") => {
        const current = gender ? gender.split(",").filter(Boolean) : [];
        let updated: string[];
        if (current.includes(target)) {
            updated = current.filter((x) => x !== target);
        } else {
            updated = [...current, target];
        }
        if (updated.length === 0 || updated.length === 3) {
            setGender(null);
        } else {
            setGender(updated.join(","));
        }
    }, [gender, setGender]);

    useEffect(() => {
        if (!ready || typeof document === "undefined") return;
        if (gender) {
            document.cookie = `gender-pref=${encodeURIComponent(JSON.stringify(gender))}; path=/; max-age=31536000; SameSite=Lax`;
        } else {
            document.cookie = `gender-pref=; path=/; max-age=0; SameSite=Lax`;
        }
    }, [gender, ready]);

    return { gender, selectedGenders, toggleGender, setGender, ready };
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

export interface RecentPerfume {
    name: string;
    slug: string;
    brand: { name: string; slug: string };
    gender: string;
    concentration?: string | null;
    fragranceFamily?: string | null;
    releaseYear?: number | null;
    imageUrl?: string | null;
    avgRating: number;
    ratingCount: number;
    accords?: string[];
    path: string;
    isAi?: boolean;
}

export function useRecentPerfumes() {
    const [items, set, ready] = useLocalState<RecentPerfume[]>("recent-perfumes", []);
    const addRecent = useCallback(
        (p: RecentPerfume) => {
            set((prev) => {
                const filtered = prev.filter((i) => i.slug !== p.slug);
                return [p, ...filtered].slice(0, 20);
            });
        },
        [set],
    );
    const clearRecent = useCallback(() => set([]), [set]);
    return { items, addRecent, clearRecent, ready };
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
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
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
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
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
