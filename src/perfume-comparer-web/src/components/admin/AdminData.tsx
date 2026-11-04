"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { adminFetch, adminJson, formatDateTime } from "@/lib/adminSession";

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

interface AiProvider {
    name: string;
    paid: boolean;
    state: string;
    cooldownUntil?: string | null;
    lastFailureKind?: string | null;
    lastError?: string | null;
    lastSuccessAt?: string | null;
    successes: number;
    failures: number;
}

type Log = { ok: boolean; text: string };

/** Bakım: örnek veri tohumlama, AI özetleri, veritabanı sıfırlama ve AI sağlayıcı durumu. */
export default function AdminData() {
    const [items, setItems] = useState<SeedItem[] | null>(null);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [log, setLog] = useState<Log[]>([]);

    const fetchStatus = useCallback(async (signal?: AbortSignal) => {
        const [seed, ai] = await Promise.all([
            adminJson<{ items: SeedItem[]; aiEnabled: boolean }>("/api/admin/seed", signal),
            adminJson<{ enabled: boolean; providers: AiProvider[] }>("/api/admin/ai-status", signal),
        ]);
        if (signal?.aborted) return;
        setItems(seed?.items ?? []);
        setAiEnabled(!!seed?.aiEnabled);
        setProviders(ai?.providers ?? []);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        (async () => { await fetchStatus(controller.signal); })();
        return () => controller.abort();
    }, [fetchStatus]);

    const push = (entries: Log[]) => setLog((prev) => [...entries, ...prev].slice(0, 20));

    const run = async (id: string, path: string) => {
        setBusy(id);
        try {
            const res = await adminFetch(path, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (Array.isArray(data.results)) {
                push((data.results as SeedResult[]).map((r) => ({ ok: r.ok, text: `${r.label}: ${r.message}` })));
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

    if (items === null) return <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>;
    const total = items.reduce((sum, i) => sum + i.count, 0);

    return (
        <>
            <p className="muted admin-note">
                Tohumlama otomatik çalışmaz. Her şemayı tek tek ya da hepsini birden tohumlayabilirsiniz;
                dolu olan şema atlanır.
            </p>
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
                                    <button className="btn btn-ghost btn-sm" disabled={busy !== null}
                                        onClick={() => run(item.key, `/api/admin/seed/${item.key}`)}>
                                        {busy === item.key ? "Tohumlanıyor…" : "Tohumla"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="admin-actions">
                <button className="btn btn-primary" disabled={busy !== null} onClick={() => run("all", "/api/admin/seed")}>
                    <Icon name="layers" size={14} /> {busy === "all" ? "Tohumlanıyor…" : "Hepsini tohumla"}
                </button>
                <button className="btn btn-ghost" disabled={busy !== null || !aiEnabled}
                    title={aiEnabled ? undefined : "AI anahtarı tanımlı değil"}
                    onClick={() => run("ai", "/api/admin/ai-summaries")}>
                    <Icon name="sparkle" size={14} /> {busy === "ai" ? "Üretiliyor…" : "AI özetlerini üret"}
                </button>
                <button className="btn btn-danger" disabled={busy !== null} onClick={reset}>
                    <Icon name="trash" size={14} /> {busy === "reset" ? "Sıfırlanıyor…" : "Veritabanını sıfırla"}
                </button>
                <span className="muted admin-toolbar-end">Toplam {total} kayıt</span>
            </div>

            {log.length > 0 && (
                <section className="block" style={{ marginBlockStart: "var(--s5)" }}>
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

            <section className="block" style={{ marginBlockStart: "var(--s5)" }}>
                <h2 className="block-title">AI sağlayıcıları</h2>
                {!aiEnabled && (
                    <p className="form-note err">AI kapalı: Gemini, Groq, Mistral veya DeepSeek anahtarı tanımlı değil.</p>
                )}
                {providers.length > 0 && (
                    <div className="table-wrap">
                        <table className="table admin-table">
                            <thead>
                                <tr>
                                    <th>Sağlayıcı</th>
                                    <th>Durum</th>
                                    <th style={{ textAlign: "end" }}>Başarılı</th>
                                    <th style={{ textAlign: "end" }}>Hatalı</th>
                                    <th>Son başarılı</th>
                                    <th>Son hata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {providers.map((p) => (
                                    <tr key={p.name}>
                                        <td><strong>{p.name}</strong>{p.paid && <span className="badge badge-warn" style={{ marginInlineStart: 6 }}>ücretli</span>}</td>
                                        <td>
                                            <span className={`badge ${p.state === "ok" ? "badge-success" : "badge-warn"}`}>
                                                {p.state === "ok" ? "Çalışıyor" : `Bekletiliyor${p.cooldownUntil ? ` (${formatDateTime(p.cooldownUntil)})` : ""}`}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "end" }}>{p.successes}</td>
                                        <td style={{ textAlign: "end" }}>{p.failures}</td>
                                        <td className="muted admin-nowrap">{formatDateTime(p.lastSuccessAt)}</td>
                                        <td className="muted">{p.lastError ? `${p.lastFailureKind ?? ""} ${p.lastError}`.trim() : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
