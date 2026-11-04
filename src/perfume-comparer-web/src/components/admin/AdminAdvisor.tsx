"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminJson, formatDateTime } from "@/lib/adminSession";
import { perfumeHref } from "@/lib/urls";

interface AdminRecommendation {
    id: number;
    userName: string;
    userEmail: string;
    perfumeName: string;
    brandName: string;
    perfumePath: string;
    promptJson: string;
    advice: string;
    createdAt: string;
}

const FIELD_LABELS: Record<string, string> = {
    Gender: "Cinsiyet",
    LikedPerfumes: "Sevdiği parfümler",
    DislikedNotes: "Sevmediği notalar",
    PreferredNotes: "Tercih ettiği notalar",
    Occasion: "Ortam",
    Season: "Mevsim",
    FreeText: "Serbest metin",
};

function parsePrompt(json: string): [string, string][] {
    try {
        const obj = JSON.parse(json) as Record<string, unknown>;
        return Object.entries(obj)
            .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
            .map(([k, v]) => [FIELD_LABELS[k] ?? k, String(v)]);
    } catch {
        return [];
    }
}

/** "Bana parfüm öner" kullanımları: kim ne istedi, hangi parfüm önerildi. */
export default function AdminAdvisor() {
    const [rows, setRows] = useState<AdminRecommendation[] | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            const result = await adminJson<AdminRecommendation[]>("/api/admin/recommendations?take=200", controller.signal);
            if (!controller.signal.aborted) setRows(result ?? []);
        })();
        return () => controller.abort();
    }, []);

    if (rows === null) return <div className="state"><div className="spinner" /><p>Yükleniyor…</p></div>;
    if (rows.length === 0) return <div className="state"><p className="muted">Henüz öneri alınmamış.</p></div>;

    return (
        <>
            <p className="muted admin-note">Son {rows.length} öneri. Ayrıntıyı görmek için satıra tıklayın.</p>
            <div className="table-wrap">
                <table className="table admin-table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Kullanıcı</th>
                            <th>Önerilen parfüm</th>
                            <th>İstek</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => {
                            const fields = parsePrompt(r.promptJson);
                            const open = r.id === openId;
                            return (
                                <tr key={r.id} className={open ? "admin-row-open" : undefined}>
                                    <td className="muted admin-nowrap">{formatDateTime(r.createdAt)}</td>
                                    <td title={r.userEmail}>{r.userName}</td>
                                    <td>
                                        {r.perfumePath
                                            ? <Link href={perfumeHref(r.perfumePath)} target="_blank">{r.brandName} {r.perfumeName}</Link>
                                            : r.perfumeName}
                                    </td>
                                    <td className="admin-comment-body">
                                        {open ? (
                                            <>
                                                <dl className="admin-prompt">
                                                    {fields.map(([k, v]) => (
                                                        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                                                    ))}
                                                </dl>
                                                <p className="admin-advice">{r.advice}</p>
                                            </>
                                        ) : (
                                            <span className="muted">{fields.map(([, v]) => v).join(" · ").slice(0, 140)}</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: "end" }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(open ? null : r.id)}>
                                            {open ? "Kapat" : "Ayrıntı"}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
