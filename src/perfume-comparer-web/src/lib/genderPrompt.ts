"use client";

import { useSyncExternalStore } from "react";

let isOpen = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
    if (isOpen === value) return;
    isOpen = value;
    listeners.forEach((l) => l());
}

/** Anasayfa parfüm tercihi penceresini açar. Anasayfa ilk ziyarette, menüler tıklanınca çağırır. */
export function openGenderPrompt() {
    set(true);
}

export function closeGenderPrompt() {
    set(false);
}

export function useGenderPromptOpen(): boolean {
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
