"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, adminJson, adminPost, formatDateTime } from "@/lib/adminSession";
import { SITE_NAME } from "@/lib/seo";

interface ContactMessage {
    id: number;
    name: string;
    email: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

interface ContactMessageList {
    items: ContactMessage[];
    unreadCount: number;
    total: number;
}

type Filter = "unread" | "all";

/**
 * İletişim formundan gelen mesajlar (/tr/iletisim). Mesajı açmak onu okundu yapmaz;
 * yönetici "Okundu" düğmesiyle işaretler, böylece cevaplanmayan mesaj gözden kaçmaz.
 */
export default function AdminContactMessages() {
    const [filter, setFilter] = useState<Filter>("unread");
    const [data, setData] = useState<ContactMessageList | null>(null);
    const [failed, setFailed] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async (which: Filter, signal?: AbortSignal) => {
        const result = await adminJson<ContactMessageList>(`/api/admin/contact-messages?status=${which}`, signal);
        if (signal?.aborted) return;
        setData(result);
        setFailed(result === null);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            await load(filter, controller.signal);
        })();
        return () => controller.abort();
    }, [filter, load]);

    const setRead = async (item: ContactMessage, read: boolean) => {
        setBusyId(item.id);
        const result = await adminPost(`/api/admin/contact-messages/${item.id}/${read ? "read" : "unread"}`);
        setNote({ ok: result.ok, text: result.message });
        setBusyId(null);
        await load(filter);
    };

    const remove = async (item: ContactMessage) => {
        if (!window.confirm(`${item.name} adlı kişinin mesajı kalıcı olarak silinecek. Emin misiniz?`)) return;
        setBusyId(item.id);
        try {
            const res = await adminFetch(`/api/admin/contact-messages/${item.id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            setNote({ ok: res.ok, text: body.message ?? (res.ok ? "Mesaj silindi." : "Mesaj silinemedi.") });
        } catch {
            setNote({ ok: false, text: "API'ye ulaşılamadı." });
        }
        setBusyId(null);
        await load(filter);
    };

    const replyHref = (item: ContactMessage) =>
        `mailto:${item.email}?subject=${encodeURIComponent(`${SITE_NAME} iletişim formu mesajınız`)}`;

    return (
        <section className="block">
            <h2 className="block-title">İletişim mesajları</h2>

            <div className="admin-toolbar">
                <button
                    type="button"
                    className={`chip${filter === "unread" ? " chip-active" : ""}`}
                    onClick={() => setFilter("unread")}
                >
                    Okunmamış{data ? ` (${data.unreadCount})` : ""}
                </button>
                <button
                    type="button"
                    className={`chip${filter === "all" ? " chip-active" : ""}`}
                    onClick={() => setFilter("all")}
                >
                    Tümü{data && filter === "all" ? ` (${data.total})` : ""}
                </button>
                {note && <span className={`form-note admin-toolbar-end ${note.ok ? "ok" : "err"}`}>{note.text}</span>}
            </div>

            {failed ? (
                <p className="form-note err">Mesajlar yüklenemedi.</p>
            ) : !data ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : data.items.length === 0 ? (
                <p className="faint">{filter === "unread" ? "Okunmamış mesaj yok." : "Henüz mesaj gelmedi."}</p>
            ) : (
                <div className="table-wrap">
                    <table className="table admin-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Gönderen</th>
                                <th>Mesaj</th>
                                <th>Durum</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="admin-nowrap">{formatDateTime(item.createdAt)}</td>
                                    <td>
                                        <strong>{item.name}</strong>
                                        <br />
                                        <a href={`mailto:${item.email}`} className="muted">{item.email}</a>
                                    </td>
                                    <td className="admin-comment-body contact-message-body">{item.message}</td>
                                    <td className="admin-nowrap">
                                        <span className={`badge ${item.isRead ? "badge-muted" : "badge-warn"}`}>
                                            {item.isRead ? "Okundu" : "Yeni"}
                                        </span>
                                    </td>
                                    <td className="admin-nowrap" style={{ textAlign: "end" }}>
                                        <a className="btn btn-ghost btn-sm" href={replyHref(item)}>Yanıtla</a>{" "}
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            disabled={busyId !== null}
                                            onClick={() => setRead(item, !item.isRead)}
                                        >
                                            {item.isRead ? "Okunmadı yap" : "Okundu"}
                                        </button>{" "}
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            disabled={busyId !== null}
                                            onClick={() => remove(item)}
                                        >
                                            Sil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
