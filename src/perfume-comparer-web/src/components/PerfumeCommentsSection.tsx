"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import Stars, { StarInput } from "./Stars";
import { API_BASE, formatDate } from "@/lib/urls";
import { useAuth } from "@/lib/stores";

export interface CommentData {
    id: number;
    body: string;
    createdAt: string;
    updatedAt?: string | null;
    isAiSummary: boolean;
    authorName?: string | null;
    rating?: number;
}

export function AiSummary({ comment }: { comment: CommentData }) {
    return (
        <div className="ai-summary">
            <div className="ai-summary-head">
                <Icon name="sparkle" size={14} />
                <span>Yorumların yapay zekâ özeti</span>
                <span className="comment-date">{formatDate(comment.updatedAt || comment.createdAt)}</span>
            </div>
            <p className="ai-summary-body">{comment.body}</p>
        </div>
    );
}

export default function PerfumeCommentsSection({
    slug,
    initialComments,
}: {
    slug: string;
    initialComments: CommentData[];
}) {
    const { token, user } = useAuth();
    const pathname = usePathname();
    const [comments, setComments] = useState<CommentData[]>(initialComments);
    const [rating, setRating] = useState(5);
    const [commentText, setCommentText] = useState("");
    const [commentStatus, setCommentStatus] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!slug) return;
        if (!comments.some((c) => c.isAiSummary)) {
            (async () => {
                try {
                    const aiRes = await fetch(`${API_BASE}/api/perfumes/${slug}/ai-summary`, { method: "POST" });
                    if (aiRes.ok && aiRes.status !== 204) {
                        const fresh = await aiRes.json();
                        setComments((prev) => [fresh as CommentData, ...prev]);
                    }
                } catch {
                    /* özet üretilemezse sayfa özetsiz çalışmaya devam eder */
                }
            })();
        }
    }, [slug, comments]);

    const submitComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setSending(true);
        setCommentStatus("");
        try {
            const res = await fetch(`${API_BASE}/api/perfumes/${slug}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ rating, content: commentText }),
            });
            if (res.ok) {
                setCommentStatus("Yorumunuz eklendi.");
                setCommentText("");
                const fresh = await fetch(`${API_BASE}/api/perfumes/${slug}/comments`);
                if (fresh.ok) setComments(await fresh.json());
            } else {
                setCommentStatus("Yorum eklenemedi.");
            }
        } catch {
            setCommentStatus("Bağlantı hatası.");
        } finally {
            setSending(false);
        }
    };

    const aiSummary = comments.find((c) => c.isAiSummary) ?? null;
    const userComments = comments.filter((c) => !c.isAiSummary);

    return (
        <section className="block">
            <h2 className="block-title">Yorumlar ({userComments.length})</h2>

            {aiSummary && <AiSummary comment={aiSummary} />}

            <div className="comment-form-wrap">
                {!user && (
                    <p className="login-prompt">
                        <Link href={`/giris?next=${encodeURIComponent(pathname)}`} className="link-more">
                            Yorum yapmak ve puan vermek için giriş yapın
                        </Link>
                    </p>
                )}
                <form onSubmit={submitComment} className={user ? "comment-form" : "comment-form is-locked"}>
                    <div className="form-group">
                        <label>Puanınız</label>
                        <StarInput value={rating} onChange={setRating} disabled={!user} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="c-body">Yorumunuz</label>
                        <textarea
                            id="c-body"
                            className="textarea"
                            placeholder="Kalıcılık, yayılım ve genel izleniminizi yazın…"
                            value={commentText}
                            disabled={!user}
                            onChange={(e) => {
                                e.target.setCustomValidity("");
                                setCommentText(e.target.value);
                            }}
                            onInvalid={(e) =>
                                e.currentTarget.setCustomValidity("Lütfen bu alanı doldurun.")
                            }
                            required
                        />
                    </div>
                    <button className="btn btn-primary" disabled={sending || !user}>
                        <Icon name="send" size={14} /> Gönder
                    </button>
                    {commentStatus && <p className="form-note ok">{commentStatus}</p>}
                </form>
            </div>

            {userComments.length > 0 ? (
                userComments.map((c) => (
                    <div key={c.id} className="comment">
                        <div className="comment-head">
                            <span className="comment-author">{c.authorName ?? "Kullanıcı"}</span>
                            <span className="comment-date">{formatDate(c.createdAt)}</span>
                        </div>
                        {c.rating && <Stars value={c.rating} size={16} />}
                        <p className="comment-body">{c.body}</p>
                    </div>
                ))
            ) : (
                <p className="empty">Henüz yorum yok. İlk yorumu siz yazın.</p>
            )}
        </section>
    );
}
