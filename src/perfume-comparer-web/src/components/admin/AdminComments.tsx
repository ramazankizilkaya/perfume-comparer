"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminJson, adminPost, formatDateTime } from "@/lib/adminSession";
import { compareHref, perfumeHref } from "@/lib/urls";
import { toast } from "@/lib/toast";

interface AdminComment {
    id: number;
    kind: "perfume" | "comparison";
    body: string;
    status: string;
    authorName: string;
    authorEmail?: string | null;
    subject: string;
    subjectPath?: string | null;
    createdAt: string;
}

const KINDS = [
    { value: "perfume", label: "Parfüm yorumları" },
    { value: "comparison", label: "Karşılaştırma yorumları" },
] as const;

const STATUSES = [
    { value: "", label: "Tümü" },
    { value: "Approved", label: "Yayında" },
    { value: "Rejected", label: "Gizlenenler" },
];

function subjectHref(c: AdminComment): string | null {
    if (!c.subjectPath) return null;
    if (c.kind === "comparison") {
        const [a, b] = c.subjectPath.split(",");
        return compareHref(a, b);
    }
    return perfumeHref(c.subjectPath);
}

/** Yorumlar otomatik yayınlanır; panelden uygunsuz olanlar gizlenir veya geri alınır. */
export default function AdminComments() {
    const [kind, setKind] = useState<AdminComment["kind"]>("perfume");
    const [status, setStatus] = useState("");
    const [rows, setRows] = useState<AdminComment[] | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const load = useCallback(async (signal?: AbortSignal) => {
        const query = `?kind=${kind}&take=200${status ? `&status=${status}` : ""}`;
        const result = await adminJson<AdminComment[]>(`/api/admin/comments${query}`, signal);
        if (signal?.aborted) return;
        setRows(result ?? []);
    }, [kind, status]);

    useEffect(() => {
        const controller = new AbortController();
        (async () => { await load(controller.signal); })();
        return () => controller.abort();
    }, [load]);

    const toggle = async (c: AdminComment) => {
        const action = c.status === "Rejected" ? "restore" : "hide";
        setBusy(c.id);
        const result = await adminPost(`/api/admin/comments/${c.kind}/${c.id}/${action}`);
        setBusy(null);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
        await load();
    };

    const toggleExpand = (id: number) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    return (
        <>
            <div className="admin-toolbar">
                {KINDS.map((k) => (
                    <button key={k.value} type="button" className={`chip${k.value === kind ? " chip-active" : ""}`}
                        onClick={() => { setKind(k.value); setRows(null); }}>
                        {k.label}
                    </button>
                ))}
                <span className="admin-toolbar-sep" />
                {STATUSES.map((s) => (
                    <button key={s.value || "all"} type="button" className={`chip${s.value === status ? " chip-active" : ""}`}
                        onClick={() => { setStatus(s.value); setRows(null); }}>
                        {s.label}
                    </button>
                ))}
                {rows && <span className="muted admin-toolbar-end">Son {rows.length} yorum</span>}
            </div>

            {rows === null ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : rows.length === 0 ? (
                <div className="state"><p className="muted">Bu listede yorum yok.</p></div>
            ) : (
                <div className="table-wrap">
                    <table className="table admin-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Kullanıcı</th>
                                <th>{kind === "comparison" ? "Karşılaştırma" : "Parfüm"}</th>
                                <th>Yorum</th>
                                <th>Durum</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((c) => {
                                const href = subjectHref(c);
                                const long = c.body.length > 160;
                                const open = expanded.has(c.id);
                                return (
                                    <tr key={c.id}>
                                        <td className="muted admin-nowrap">{formatDateTime(c.createdAt)}</td>
                                        <td title={c.authorEmail ?? undefined}>{c.authorName}</td>
                                        <td>{href ? <Link href={href} target="_blank">{c.subject}</Link> : c.subject}</td>
                                        <td className="admin-comment-body">
                                            {long && !open ? `${c.body.slice(0, 160)}…` : c.body}
                                            {long && (
                                                <button type="button" className="link-more" onClick={() => toggleExpand(c.id)}>
                                                    {open ? " Kısalt" : " Devamı"}
                                                </button>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${c.status === "Rejected" ? "badge-danger" : "badge-success"}`}>
                                                {c.status === "Rejected" ? "Gizli" : "Yayında"}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "end" }}>
                                            <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => toggle(c)}>
                                                {busy === c.id ? "…" : c.status === "Rejected" ? "Geri al" : "Gizle"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
