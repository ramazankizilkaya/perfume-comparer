"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reaktif localStorage state'i. Aynı sekmede birden çok bileşen aynı anahtarı
 * paylaştığında (ör. header rozeti + kart butonu) hepsi senkron güncellenir.
 *
 * useSyncExternalStore ile çalışır: sunucuda ve hydration sırasında fallback
 * döner, tarayıcıda gerçek değer okunur (`ready` bunu bildirir). Böylece SSR
 * uyuşmazlığı olmaz ve effect içinde setState çağrısına gerek kalmaz.
 *
 * localStorage kapalıysa (gizli pencere, site verisi engeli) bellek içi yedek
 * kullanılır; toggle'lar sayfa açık kaldığı sürece yine çalışır.
 */

const listeners = new Map<string, Set<() => void>>();
const memory = new Map<string, string | null>();
const snapshots = new Map<string, { raw: string | null; value: unknown }>();
const subscribers = new Map<string, (cb: () => void) => () => void>();

function readRaw(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return memory.get(key) ?? null;
    }
}

function writeRaw(key: string, raw: string | null): void {
    memory.set(key, raw);
    try {
        if (raw === null) localStorage.removeItem(key);
        else localStorage.setItem(key, raw);
    } catch {
        /* kota dolu ya da erişim kapalı; bellek yedeği yeterli */
    }
}

function emit(key: string): void {
    listeners.get(key)?.forEach((fn) => fn());
}

/** Anahtarın güncel değerini okur. Değer değişmediyse aynı referansı döner (React bunu ister). */
export function readLocal<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    const raw = readRaw(key);
    const cached = snapshots.get(key);
    if (cached && cached.raw === raw) return cached.value as T;

    let value: T = fallback;
    if (raw !== null) {
        try {
            value = JSON.parse(raw) as T;
        } catch {
            value = fallback;
        }
    }
    snapshots.set(key, { raw, value });
    return value;
}

/** Değeri yazar ve aynı anahtarı dinleyen tüm bileşenleri günceller. */
export function writeLocal<T>(key: string, value: T): void {
    const raw = value === null || value === undefined ? null : JSON.stringify(value);
    writeRaw(key, raw);
    snapshots.set(key, { raw, value });
    emit(key);
}

function subscribeFor(key: string): (cb: () => void) => () => void {
    let sub = subscribers.get(key);
    if (!sub) {
        sub = (cb: () => void) => {
            if (!listeners.has(key)) listeners.set(key, new Set());
            listeners.get(key)!.add(cb);
            const onStorage = (e: StorageEvent) => {
                if (e.key === key || e.key === null) cb();
            };
            window.addEventListener("storage", onStorage);
            return () => {
                listeners.get(key)?.delete(cb);
                window.removeEventListener("storage", onStorage);
            };
        };
        subscribers.set(key, sub);
    }
    return sub;
}

const subscribeNoop = () => () => {};

/** Hydration bitti mi? Sunucuda false, tarayıcıda ilk client render'dan itibaren true. */
export function useHydrated(): boolean {
    return useSyncExternalStore(
        subscribeNoop,
        () => true,
        () => false,
    );
}

export function useLocalState<T>(
    key: string,
    fallback: T,
): [T, (v: T | ((prev: T) => T)) => void, boolean] {
    const state = useSyncExternalStore(
        subscribeFor(key),
        () => readLocal(key, fallback),
        () => fallback,
    );
    const ready = useHydrated();

    const set = useCallback(
        (v: T | ((prev: T) => T)) => {
            const next = typeof v === "function" ? (v as (p: T) => T)(readLocal(key, fallback)) : v;
            writeLocal(key, next);
        },
        // fallback yalnızca ilk okumada anlam taşır; her render'da yeni nesne gelse de davranış aynıdır.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [key],
    );

    return [state, set, ready];
}
