"use client";

import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import LoginPrompt from "@/components/LoginPrompt";
import { API_BASE } from "@/lib/urls";
import { useAuth, authFetch } from "@/lib/stores";

interface SeedItem {
    key: string;
    label: string;
    description: string;
    /** Bu şemadan önce tohumlanması gerekenler (virgüllü anahtar listesi). */
    requires: string;
    count: number;
}

interface SeedResult {
    key: string;
    label: string;
    ok: boolean;
    message: string;
    count: number;
}

interface SeedStatus {
    items: SeedItem[];
    aiEnabled: boolean;
}

type Log = { ok: boolean; text: string };

/**
 * /tr/admin — API'deki /api/admin/* uçları Admin rolü ister. İstekler oturumdaki
 * token ile gider (authFetch); giriş yoksa LoginPrompt, yetki yoksa (403) açıklama görünür.
 */
export default function AdminPage() {
    const { token, ready } = useAuth();
    const [status, setStatus] = useState<SeedStatus | null>(null);
    const [access, setAccess] = useState<"ok" | "forbidden" | "failed">("ok");
    const [busy, setBusy] = useState<string | null>(null);
    const [log, setLog] = useState<Log[]>([]);

    const fetchStatus = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await authFetch(`${API_BASE}/api/admin/seed`, { signal });
            if (signal?.aborted) return;
            if (res.status === 403) {
                setAccess("forbidden");
                return;
            }
            if (!res.ok) throw new Error("status");
            const data = await res.json();
            setStatus({ items: data.items ?? [], aiEnabled: !!data.aiEnabled });
            setAccess("ok");
        } catch {
            if (!signal?.aborted) setAccess("failed");
        }
    }, []);

    useEffect(() => {
        if (!ready || !token) return;
        const controller = new AbortController();
        (async () => {
            await fetchStatus(controller.signal);
        })();
        return () => controller.abort();
    }, [ready, token, fetchStatus]);

    const push = (entries: Log[]) => setLog((prev) => [...entries, ...prev].slice(0, 20));

    const run = async (id: string, path: string, method = "POST") => {
        setBusy(id);
        try {
            const res = await authFetch(`${API_BASE}${path}`, { method });
            const data = await res.json().catch(() => ({}));

            if (res.status === 403) {
                setAccess("forbidden");
                push([{ ok: false, text: "Bu işlem için yetkiniz yok." }]);
            } else if (Array.isArray(data.results)) {
                push((data.results as SeedResult[]).map((r) => ({
                    ok: r.ok,
                    text: `${r.label}: ${r.message}`,
                })));
            } else if (data.label) {
                push([{ ok: !!data.ok, text: `${data.label}: ${data.message}` }]);
            } else {
                push([{ ok: res.ok, text: data.message ?? (res.ok ? "Tamam." : "İşlem başarısız.") }]);
            }
        } catch {
            push([{ ok: false, text: "API'ye ulaşılamadı." }]);
        } finally {
            setBusy(null);
            await fetchStatus();
        }
    };

    const reset = async () => {
        if (!window.confirm("Veritabanı silinip boş şema yeniden kurulacak. Tüm veriler gidecek. Emin misiniz?")) return;
        await run("reset", "/api/admin/reset");
    };

    const items = status?.items ?? [];
    const aiEnabled = status?.aiEnabled ?? false;
    const loading = access === "ok" && status === null;
    const total = items.reduce((sum, i) => sum + i.count, 0);

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Yönetim" }]} />

            <header style={{ marginBottom: "1.25rem" }}>
                <span className="eyebrow">Geliştirici</span>
                <h1 className="page-title">Veri yönetimi</h1>
                <p className="section-desc">
                    Tohumlama otomatik çalışmaz. Her şemayı buradan tek tek basabilir, gerekirse
                    hepsini birden tohumlayabilirsiniz. Her adım idempotenttir: dolu olan şema atlanır.
                </p>
            </header>

            <LoginPrompt label="Yönetim paneline erişmek için giriş yapın." renderBeforeHydration>
                {access === "forbidden" ? (
                    <div className="state">
                        <h2>Bu sayfa için yetkiniz yok</h2>
                        <p className="muted">Veri yönetimi yalnızca yönetici hesaplarına açıktır.</p>
                    </div>
                ) : access === "failed" ? (
                    <p className="form-note err">API&apos;ye ulaşılamadı. Sunucunun çalıştığından emin olun.</p>
                ) : loading ? (
                    <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table admin-table">
                                <thead>
                                    <tr>
                                        <th>Şema</th>
                                        <th>İçerik</th>
                                        <th>Gereksinim</th>
                                        <th style={{ textAlign: "end" }}>Kayıt</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.key}>
                                            <td><strong>{item.label}</strong></td>
                                            <td className="muted">{item.description}</td>
                                            <td className="muted">{item.requires || "—"}</td>
                                            <td style={{ textAlign: "end", fontVariantNumeric: "tabular-nums" }}>
                                                {item.count > 0 ? item.count : <span className="faint">boş</span>}
                                            </td>
                                            <td style={{ textAlign: "end" }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    disabled={busy !== null}
                                                    onClick={() => run(item.key, `/api/admin/seed/${item.key}`)}
                                                >
                                                    {busy === item.key ? "Tohumlanıyor…" : "Tohumla"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="admin-actions">
                            <button
                                className="btn btn-primary"
                                disabled={busy !== null}
                                onClick={() => run("all", "/api/admin/seed")}
                            >
                                <Icon name="layers" size={14} /> {busy === "all" ? "Tohumlanıyor…" : "Hepsini tohumla"}
                            </button>

                            <button
                                className="btn btn-ghost"
                                disabled={busy !== null || !aiEnabled}
                                title={aiEnabled ? undefined : "Ai:ApiKey veya ANTHROPIC_API_KEY tanımlı değil"}
                                onClick={() => run("ai", "/api/admin/ai-summaries")}
                            >
                                <Icon name="sparkle" size={14} /> {busy === "ai" ? "Üretiliyor…" : "AI özetlerini üret"}
                            </button>

                            <button
                                className="btn btn-danger"
                                disabled={busy !== null}
                                onClick={reset}
                            >
                                <Icon name="trash" size={14} /> {busy === "reset" ? "Sıfırlanıyor…" : "Veritabanını sıfırla"}
                            </button>

                            <span className="muted" style={{ marginInlineStart: "auto", fontSize: "var(--fs-sm)" }}>
                                Toplam {total} kayıt
                            </span>
                        </div>

                        {!aiEnabled && (
                            <p className="faint" style={{ fontSize: "var(--fs-xs)", marginBlockStart: "var(--s3)" }}>
                                AI özetleri kapalı: <code>Ai:ApiKey</code> ayarı ya da <code>ANTHROPIC_API_KEY</code>{" "}
                                ortam değişkeni tanımlı değil.
                            </p>
                        )}

                        {log.length > 0 && (
                            <section className="block" style={{ marginBlockStart: "var(--s6)" }}>
                                <h2 className="block-title">Son işlemler</h2>
                                <ul className="admin-log">
                                    {log.map((l, i) => (
                                        <li key={i} className={l.ok ? "ok" : "err"}>
                                            <Icon name={l.ok ? "check" : "close"} size={13} /> {l.text}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </>
                )}
            </LoginPrompt>
        </>
    );
}
