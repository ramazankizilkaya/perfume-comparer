"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RichTextRenderer from "@/components/RichTextRenderer";
import Icon from "@/components/Icon";
import { adminJson, adminPost, BLOG_STATUS_BADGE, BLOG_STATUS_LABEL, formatDateTime } from "@/lib/adminSession";
import { blogHref, mediaUrl } from "@/lib/urls";
import { toast } from "@/lib/toast";

interface AdminBlog {
    id: number;
    title: string;
    slug: string;
    excerpt?: string | null;
    body: string;
    coverImageUrl?: string | null;
    category?: string | null;
    status: string;
    viewCount: number;
    authorName: string;
    authorEmail: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
}

const FILTERS: { value: string; label: string }[] = [
    { value: "Pending", label: "Onay bekleyenler" },
    { value: "", label: "Tümü" },
    { value: "Published", label: "Yayında" },
    { value: "Rejected", label: "Reddedilenler" },
];

/** Makale onayı: listeden yazı seçilir, tam metin okunur, onaylanır ya da reddedilir. */
export default function AdminBlogs({ onChanged }: { onChanged?: () => void }) {
    const [filter, setFilter] = useState("Pending");
    const [posts, setPosts] = useState<AdminBlog[] | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);
    const [busy, setBusy] = useState<number | null>(null);

    const load = useCallback(async (signal?: AbortSignal) => {
        const query = filter ? `?status=${filter}` : "";
        const result = await adminJson<AdminBlog[]>(`/api/admin/blogs${query}`, signal);
        if (signal?.aborted) return;
        setPosts(result ?? []);
    }, [filter]);

    useEffect(() => {
        const controller = new AbortController();
        (async () => { await load(controller.signal); })();
        return () => controller.abort();
    }, [load]);

    const moderate = async (post: AdminBlog, action: "approve" | "reject") => {
        if (action === "reject" && !window.confirm(`"${post.title}" reddedilsin mi? Yazı sitede görünmez.`)) return;
        setBusy(post.id);
        const result = await adminPost(`/api/blogs/${post.id}/${action}`);
        setBusy(null);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
        setOpenId(null);
        await load();
        onChanged?.();
    };

    const open = posts?.find((p) => p.id === openId) ?? null;

    return (
        <>
            <div className="admin-toolbar">
                {FILTERS.map((f) => (
                    <button
                        key={f.value || "all"}
                        type="button"
                        className={`chip${f.value === filter ? " chip-active" : ""}`}
                        onClick={() => { setFilter(f.value); setOpenId(null); setPosts(null); }}
                    >
                        {f.label}
                    </button>
                ))}
                {posts && <span className="muted admin-toolbar-end">{posts.length} yazı</span>}
            </div>

            {posts === null ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : posts.length === 0 ? (
                <div className="state"><p className="muted">Bu listede yazı yok.</p></div>
            ) : (
                <div className="table-wrap">
                    <table className="table admin-table">
                        <thead>
                            <tr>
                                <th>Başlık</th>
                                <th>Yazar</th>
                                <th>Gönderildi</th>
                                <th>Durum</th>
                                <th style={{ textAlign: "end" }}>Okunma</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map((p) => (
                                <tr key={p.id} className={p.id === openId ? "admin-row-open" : undefined}>
                                    <td><strong>{p.title}</strong></td>
                                    <td className="muted">{p.authorName}</td>
                                    <td className="muted">{formatDateTime(p.createdAt)}</td>
                                    <td><span className={`badge ${BLOG_STATUS_BADGE[p.status] ?? "badge-muted"}`}>{BLOG_STATUS_LABEL[p.status] ?? p.status}</span></td>
                                    <td style={{ textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{p.viewCount}</td>
                                    <td style={{ textAlign: "end" }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(p.id === openId ? null : p.id)}>
                                            {p.id === openId ? "Kapat" : "İncele"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {open && (
                <section className="block admin-review" aria-label="Yazı inceleme">
                    <div className="admin-review-head">
                        <div>
                            <span className={`badge ${BLOG_STATUS_BADGE[open.status] ?? "badge-muted"}`}>{BLOG_STATUS_LABEL[open.status] ?? open.status}</span>
                            <h2 className="admin-review-title">{open.title}</h2>
                            <p className="muted">
                                {open.authorName} ({open.authorEmail}) · Gönderildi {formatDateTime(open.createdAt)}
                                {open.publishedAt && <> · Yayın {formatDateTime(open.publishedAt)}</>}
                                {open.category && <> · Bölüm: {open.category}</>}
                                {" "}· {open.body.length.toLocaleString("tr-TR")} karakter
                            </p>
                        </div>
                        <div className="admin-review-actions">
                            {open.status !== "Published" && (
                                <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => moderate(open, "approve")}>
                                    <Icon name="check" size={13} /> {busy === open.id ? "Kaydediliyor…" : "Onayla ve yayınla"}
                                </button>
                            )}
                            {open.status !== "Rejected" && (
                                <button className="btn btn-danger btn-sm" disabled={busy !== null} onClick={() => moderate(open, "reject")}>
                                    <Icon name="close" size={13} /> {open.status === "Published" ? "Yayından kaldır" : "Reddet"}
                                </button>
                            )}
                            {open.status === "Published" && (
                                <Link className="btn btn-ghost btn-sm" href={blogHref(open.slug)} target="_blank">
                                    <Icon name="external" size={13} /> Sitede aç
                                </Link>
                            )}
                        </div>
                    </div>

                    {open.coverImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="admin-review-cover" src={mediaUrl(open.coverImageUrl)} alt={`${open.title} - blog kapak görseli`} />
                    )}
                    {open.excerpt && <p className="admin-review-excerpt">{open.excerpt}</p>}
                    <RichTextRenderer content={open.body} />
                </section>
            )}
        </>
    );
}
