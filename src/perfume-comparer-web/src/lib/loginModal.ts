"use client";

import { useSyncExternalStore } from "react";

let isOpen = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
    if (isOpen === value) return;
    isOpen = value;
    listeners.forEach((l) => l());
}

/** Giriş penceresini açar. Giriş isteyen her düğme ve link bunu çağırır; sayfadan ayrılmaz. */
export function openLogin() {
    set(true);
}

export function closeLogin() {
    set(false);
}

export function useLoginModalOpen(): boolean {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => isOpen,
        () => false,
    );
}
