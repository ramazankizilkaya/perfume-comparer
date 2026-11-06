"use client";

import { useCallback, useEffect, useState } from "react";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminBlogs from "@/components/admin/AdminBlogs";
import AdminComments from "@/components/admin/AdminComments";
import AdminPhotos from "@/components/admin/AdminPhotos";
import AdminAdvisor from "@/components/admin/AdminAdvisor";
import AdminData from "@/components/admin/AdminData";
import AdminContactMessages from "@/components/admin/AdminContactMessages";
import { adminJson, useAdminSession } from "@/lib/adminSession";
import { useLocalState } from "@/lib/clientStore";

const TABS = [
    { key: "overview", label: "Genel bakış" },
    { key: "blogs", label: "Makale onayı" },
    { key: "photos", label: "Fotoğraflar" },
    { key: "comments", label: "Yorumlar" },
    { key: "advisor", label: "Parfüm önerileri" },
    { key: "contact", label: "İletişim" },
    { key: "data", label: "Veri ve AI" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * /tr/admin — yönetim paneli. Giriş, panel şifresiyle yapılır (POST /api/auth/admin-login)
 * ve sitenin kullanıcı oturumundan ayrı tutulur (lib/adminSession.ts).
 */
export default function AdminPage() {
    const { token, ready, login, logout } = useAdminSession();
    const [tab, setTab] = useLocalState<TabKey>("admin-tab", "overview");
    const [pending, setPending] = useState<number | null>(null);
    const [pendingPhotos, setPendingPhotos] = useState<number | null>(null);
    const [unread, setUnread] = useState<number | null>(null);

    const refreshPending = useCallback(async () => {
        const [rows, photos, contact] = await Promise.all([
            adminJson<unknown[]>("/api/admin/blogs?status=Pending"),
            adminJson<{ pendingCount?: number }>("/api/admin/photos?status=pending"),
            adminJson<{ unreadCount?: number }>("/api/admin/contact-messages?status=unread"),
        ]);
        setPending(rows ? rows.length : null);
        setPendingPhotos(photos?.pendingCount ?? null);
        setUnread(contact?.unreadCount ?? null);
    }, []);

    useEffect(() => {
        if (!token) return;
        (async () => { await refreshPending(); })();
    }, [token, refreshPending]);

    const active = TABS.some((t) => t.key === tab) ? tab : "overview";

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Yönetim" }]} />

            <h1 className="sr-only">Yönetim paneli</h1>
            {ready && token && (
                <header className="admin-head">
                    <span />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Çıkış yap</button>
                </header>
            )}

            {!ready ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : !token ? (
                <AdminLogin onLogin={login} />
            ) : (
                <>
                    <nav className="admin-tabs" aria-label="Panel bölümleri">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                className={`admin-tab${t.key === active ? " is-active" : ""}`}
                                aria-current={t.key === active ? "page" : undefined}
                                onClick={() => setTab(t.key)}
                            >
                                {t.label}
                                {t.key === "blogs" && pending ? <span className="admin-tab-count">{pending}</span> : null}
                                {t.key === "photos" && pendingPhotos ? <span className="admin-tab-count">{pendingPhotos}</span> : null}
                                {t.key === "contact" && unread ? <span className="admin-tab-count">{unread}</span> : null}
                            </button>
                        ))}
                    </nav>

                    {active === "overview" && <AdminOverview />}
                    {active === "blogs" && <AdminBlogs onChanged={refreshPending} />}
                    {active === "photos" && <AdminPhotos onChanged={refreshPending} />}
                    {active === "comments" && <AdminComments />}
                    {active === "advisor" && <AdminAdvisor />}
                    {active === "contact" && <AdminContactMessages />}
                    {active === "data" && <AdminData />}
                </>
            )}
        </>
    );
}

function AdminLogin({ onLogin }: { onLogin: (password: string) => Promise<string | null> }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setBusy(true);
        const message = await onLogin(password);
        setBusy(false);
        setError(message);
        if (message) setPassword("");
    };

    return (
        <form className="block admin-login" onSubmit={submit}>
            <h2 className="block-title">Panel girişi</h2>
            <div className="form-group">
                <label htmlFor="admin-password">Şifre</label>
                <input
                    id="admin-password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || !password}>
                {busy ? "Kontrol ediliyor…" : "Giriş yap"}
            </button>
            {error && <p className="form-note err" role="alert">{error}</p>}
        </form>
    );
}
