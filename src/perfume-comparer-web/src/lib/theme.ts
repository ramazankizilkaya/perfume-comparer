"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const THEME_KEY = "theme";
// localStorage kapalıysa (gizli pencere, site verisi engeli) tema sayfa açık kaldığı sürece burada yaşar.
let memoryTheme: Theme = "light";
const themeListeners = new Set<() => void>();

function readTheme(): Theme {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "dark" || saved === "light") return saved;
    } catch {
        /* erişim yok; bellek yedeği kullanılır */
    }
    return memoryTheme;
}

function writeTheme(next: Theme): void {
    memoryTheme = next;
    try {
        localStorage.setItem(THEME_KEY, next);
    } catch {
        /* kaydedilemese de bu oturumda tema değişir */
    }
    themeListeners.forEach((fn) => fn());
}

function subscribeTheme(cb: () => void): () => void {
    themeListeners.add(cb);
    return () => {
        themeListeners.delete(cb);
    };
}

/** Tema: sunucuda ve hydration sırasında "light", tarayıcıda kayıtlı değer. Başlık ve kullanıcı menüsü aynı değeri paylaşır. */
export function useTheme() {
    const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as Theme);
    const toggleTheme = () => writeTheme(theme === "dark" ? "light" : "dark");
    return { theme, toggleTheme };
}
