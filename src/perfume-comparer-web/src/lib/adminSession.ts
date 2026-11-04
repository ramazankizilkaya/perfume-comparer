"use client";

import { useCallback } from "react";
import { readLocal, useLocalState, writeLocal } from "./clientStore";
import { isTokenExpired } from "./stores";
import { API_BASE } from "./urls";

/**
 * Yönetim paneli oturumu. Sitenin kullanıcı oturumundan (auth-session) ayrıdır:
 * panel şifresiyle alınan 12 saatlik Admin jetonu yalnızca /tr/admin sayfasında
 * kullanılır, sitede kimseyi "girişli" göstermez.
 */
const ADMIN_KEY = "admin-session";

interface AdminSession {
    token: string;
}

function liveToken(session: AdminSession | null): string | null {
    return session && !isTokenExpired(session.token) ? session.token : null;
}

export function useAdminSession() {
    const [session, setSession, ready] = useLocalState<AdminSession | null>(ADMIN_KEY, null);

    const login = useCallback(async (password: string): Promise<string | null> => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/admin-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
                body: JSON.stringify({ password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.token) return data.message ?? "Giriş başarısız.";
            setSession({ token: data.token });
            return null;
        } catch {
            return "API'ye ulaşılamadı.";
        }
    }, [setSession]);

    const logout = useCallback(() => setSession(null), [setSession]);

    return { token: liveToken(session), ready, login, logout };
}

/** Panel jetonuyla istek. 401/403 gelirse panel oturumu silinir ve şifre ekranı döner. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = liveToken(readLocal<AdminSession | null>(ADMIN_KEY, null));
    const headers = new Headers(init.headers);
    headers.set("X-Requested-With", "XMLHttpRequest");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    if (res.status === 401 || res.status === 403) writeLocal<AdminSession | null>(ADMIN_KEY, null);
    return res;
}

/** GET + JSON; hata durumunda null döner. */
export async function adminJson<T>(path: string, signal?: AbortSignal): Promise<T | null> {
    try {
        const res = await adminFetch(path, { signal });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

/** POST; sunucunun mesajını ve başarı durumunu döner. */
export async function adminPost(path: string): Promise<{ ok: boolean; message: string; data: Record<string, unknown> }> {
    try {
        const res = await adminFetch(path, { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return { ok: res.ok, message: String(data.message ?? (res.ok ? "Tamam." : "İşlem başarısız.")), data };
    } catch {
        return { ok: false, message: "API'ye ulaşılamadı.", data: {} };
    }
}

/** "2026-11-04T10:12:00Z" -> "4 Kas 2026 13:12" (Türkiye saati). */
export function formatDateTime(value?: string | null): string {
    if (!value) return "—";
    return new Date(value).toLocaleString("tr-TR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Istanbul",
    });
}

export const BLOG_STATUS_LABEL: Record<string, string> = {
    Pending: "Onay bekliyor",
    Published: "Yayında",
    Rejected: "Reddedildi",
    Draft: "Taslak",
};

export const BLOG_STATUS_BADGE: Record<string, string> = {
    Pending: "badge-warn",
    Published: "badge-success",
    Rejected: "badge-danger",
    Draft: "badge-muted",
};
