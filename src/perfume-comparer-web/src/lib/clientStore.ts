"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Reaktif localStorage state'i. Aynı sekmede birden çok bileşen aynı anahtarı
 * paylaştığında (ör. header rozeti + kart butonu) hepsi senkron güncellenir.
 * SSR uyuşmazlığını önlemek için ilk render fallback ile yapılır, gerçek değer
 * mount'ta yüklenir (`ready` bunu bildirir).
 */

function read<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
        const v = localStorage.getItem(key);
        return v ? (JSON.parse(v) as T) : fallback;
    } catch {
        return fallback;
    }
}

const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
    listeners.get(key)?.forEach((fn) => fn());
}

export function useLocalState<T>(
    key: string,
    fallback: T,
): [T, (v: T | ((prev: T) => T)) => void, boolean] {
    const [state, setState] = useState<T>(fallback);
    const [ready, setReady] = useState(false);

    // En güncel değeri tutan ref; set() yan etkileri setState updater'ının
    // DIŞINDA yapar. Aksi halde React Strict Mode updater'ı iki kez çağırıp
    // localStorage'ı okuyup yazan bir toggle'ı geri alır (net sıfır).
    const ref = useRef<T>(state);
    ref.current = state;

    useEffect(() => {
        const current = read(key, fallback);
        ref.current = current;
        setState(current);
        setReady(true);

        const fn = () => {
            const next = read(key, fallback);
            ref.current = next;
            setState(next);
        };
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key)!.add(fn);

        const onStorage = (e: StorageEvent) => {
            if (e.key === key) fn();
        };
        window.addEventListener("storage", onStorage);

        return () => {
            listeners.get(key)?.delete(fn);
            window.removeEventListener("storage", onStorage);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const set = useCallback(
        (v: T | ((prev: T) => T)) => {
            const next = typeof v === "function" ? (v as (p: T) => T)(ref.current) : v;
            ref.current = next;
            setState(next);
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                /* kota dolabilir; sessiz geç */
            }
            emit(key);
        },
        [key],
    );

    return [state, set, ready];
}
