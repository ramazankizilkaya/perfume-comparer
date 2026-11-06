"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch, adminJson, adminPost, formatDateTime } from "@/lib/adminSession";
import { mediaUrl, perfumeHref } from "@/lib/urls";
import ImageLightboxModal from "@/components/ImageLightboxModal";
import { toast } from "@/lib/toast";

interface AdminPhoto {
    id: number;
    imageUrl: string;
    isApproved: boolean;
    authorName: string;
    authorEmail?: string | null;
    perfumeName: string;
    perfumePath?: string | null;
    createdAt: string;
}

interface AdminPhotoList {
    items: AdminPhoto[];
    pendingCount: number;
    total: number;
}

type PhotoFilter = "pending" | "approved" | "all";

/**
 * Kullanıcıların parfüm detay sayfalarından yüklediği şişe fotoğrafları.
 * Yüklenen her fotoğraf WebP formatına dönüştürülür ve burada admin onayına düşer.
 */
export default function AdminPhotos({ onChanged }: { onChanged?: () => void }) {
    const [filter, setFilter] = useState<PhotoFilter>("pending");
    const [data, setData] = useState<AdminPhotoList | null>(null);
    const [failed, setFailed] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

    const load = useCallback(async (which: PhotoFilter, signal?: AbortSignal) => {
        const result = await adminJson<AdminPhotoList>(`/api/admin/photos?status=${which}&take=100`, signal);
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

    const toggleApprove = async (item: AdminPhoto, approve: boolean) => {
        setBusyId(item.id);
        const result = await adminPost(`/api/admin/photos/${item.id}/${approve ? "approve" : "unapprove"}`);
        setBusyId(null);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
        await load(filter);
        onChanged?.();
    };

    const remove = async (item: AdminPhoto) => {
        if (!window.confirm(`${item.authorName} tarafından yüklenen fotoğraf kalıcı olarak silinecek. Emin misiniz?`)) return;
        setBusyId(item.id);
        try {
            const res = await adminFetch(`/api/admin/photos/${item.id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            const msg = body.message ?? (res.ok ? "Fotoğraf silindi." : "Fotoğraf silinemedi.");
            if (res.ok) toast.success(msg);
            else toast.error(msg);
        } catch {
            toast.error("API'ye ulaşılamadı.");
        }
        setBusyId(null);
        await load(filter);
        onChanged?.();
    };

    return (
        <section className="block">
            <h2 className="block-title">Kullanıcı fotoğrafları onayı</h2>

            <div className="admin-toolbar">
                <button
                    type="button"
                    className={`chip${filter === "pending" ? " chip-active" : ""}`}
                    onClick={() => setFilter("pending")}
                >
                    Onay bekleyenler{data ? ` (${data.pendingCount})` : ""}
                </button>
                <button
                    type="button"
                    className={`chip${filter === "approved" ? " chip-active" : ""}`}
                    onClick={() => setFilter("approved")}
                >
                    Yayında
                </button>
                <button
                    type="button"
                    className={`chip${filter === "all" ? " chip-active" : ""}`}
                    onClick={() => setFilter("all")}
                >
                    Tümü{data ? ` (${data.total})` : ""}
                </button>
            </div>

            {failed ? (
                <p className="form-note err">Fotoğraflar yüklenemedi.</p>
            ) : !data ? (
                <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>
            ) : data.items.length === 0 ? (
                <p className="faint">
                    {filter === "pending" ? "Onay bekleyen fotoğraf yok." : "Bu filtrede fotoğraf bulunmuyor."}
                </p>
            ) : (
                <div className="table-wrap">
                    <table className="table admin-table">
                        <thead>
                            <tr>
                                <th>Görsel</th>
                                <th>Tarih</th>
                                <th>Kullanıcı</th>
                                <th>Parfüm</th>
                                <th>Durum</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item) => {
                                const imgSrc = mediaUrl(item.imageUrl) ?? item.imageUrl;
                                const imgAlt = `${item.perfumeName} - ${item.authorName} tarafından yüklenen orijinal parfüm şişesi fotoğrafı`;
                                const href = item.perfumePath ? perfumeHref(item.perfumePath) : null;
                                return (
                                    <tr key={item.id}>
                                        <td style={{ width: 72 }}>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                style={{ padding: 2 }}
                                                onClick={() => setLightbox({ src: imgSrc, alt: imgAlt })}
                                                title="Büyütmek için tıklayın"
                                            >
                                                <img
                                                    src={imgSrc}
                                                    alt={imgAlt}
                                                    style={{
                                                        width: 52,
                                                        height: 52,
                                                        objectFit: "cover",
                                                        borderRadius: "var(--r-sm)",
                                                        border: "1px solid var(--border)",
                                                        display: "block",
                                                    }}
                                                />
                                            </button>
                                        </td>
                                        <td className="muted admin-nowrap">{formatDateTime(item.createdAt)}</td>
                                        <td title={item.authorEmail ?? undefined}>{item.authorName}</td>
                                        <td>
                                            {href ? (
                                                <Link href={href} target="_blank">
                                                    {item.perfumeName}
                                                </Link>
                                            ) : (
                                                item.perfumeName
                                            )}
                                        </td>
                                        <td className="admin-nowrap">
                                            <span className={`badge ${item.isApproved ? "badge-success" : "badge-warn"}`}>
                                                {item.isApproved ? "Yayında" : "Onay bekliyor"}
                                            </span>
                                        </td>
                                        <td className="admin-nowrap" style={{ textAlign: "end" }}>
                                            {item.isApproved ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    disabled={busyId !== null}
                                                    onClick={() => toggleApprove(item, false)}
                                                >
                                                    Yayından kaldır
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    disabled={busyId !== null}
                                                    onClick={() => toggleApprove(item, true)}
                                                >
                                                    Onayla
                                                </button>
                                            )}{" "}
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <ImageLightboxModal
                src={lightbox?.src ?? ""}
                alt={lightbox?.alt ?? ""}
                isOpen={lightbox !== null}
                onClose={() => setLightbox(null)}
            />
        </section>
    );
}
