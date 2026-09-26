"use client";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let activeToasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
    listeners.forEach((l) => l([...activeToasts]));
}

export const toast = {
    show(message: string, type: ToastType = "info", duration = 4000): string {
        const id = Math.random().toString(36).substring(2, 9);
        const item: ToastItem = { id, message, type, duration };
        activeToasts = [...activeToasts, item];
        notify();

        if (duration > 0) {
            setTimeout(() => {
                toast.dismiss(id);
            }, duration);
        }
        return id;
    },
    success(message: string, duration = 4000): string {
        return toast.show(message, "success", duration);
    },
    error(message: string, duration = 5000): string {
        return toast.show(message, "error", duration);
    },
    info(message: string, duration = 4000): string {
        return toast.show(message, "info", duration);
    },
    warning(message: string, duration = 4500): string {
        return toast.show(message, "warning", duration);
    },
    dismiss(id: string) {
        activeToasts = activeToasts.filter((t) => t.id !== id);
        notify();
    },
    subscribe(listener: ToastListener) {
        listeners.add(listener);
        listener([...activeToasts]);
        return () => {
            listeners.delete(listener);
        };
    },
};
