"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import LoginPrompt from "./LoginPrompt";
import RichTextEditor from "./RichTextEditor";
import { API_BASE } from "@/lib/urls";
import { useAuth } from "@/lib/stores";

export default function BlogWriteSection() {
    const { token, user } = useAuth();
    const [writing, setWriting] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [coverImageUrl, setCoverImageUrl] = useState("");
    const [status, setStatus] = useState("");
    const [sending, setSending] = useState(false);
    const router = useRouter();

    const handleOpenPreview = () => {
        try {
            sessionStorage.setItem(
                "aura_blog_preview",
                JSON.stringify({
                    title: title || "Başlıksız Taslak Makale",
                    body: content || "İçerik henüz girilmedi.",
                    coverImageUrl:
                        coverImageUrl ||
                        "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800",
                    authorName: user?.name || user?.email || "Siz (Yazar)",
                })
            );
            window.open("/blog/onizleme", "_blank");
        } catch (e) {
            console.error("Önizleme kaydedilemedi:", e);
        }
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSending(true);
        setStatus("");
        try {
            const res = await fetch(`${API_BASE}/api/blogs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    title,
                    body: content,
                    coverImageUrl: coverImageUrl || undefined,
                }),
            });
            if (res.ok) {
                setStatus("Yazınız admin onayına sunulmak üzere başarıyla kaydedildi.");
                setTitle("");
                setContent("");
                setCoverImageUrl("");
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                setStatus(data.message || "Yazı kaydedilemedi.");
            }
        } catch {
            setStatus("Bağlantı hatası oluştu.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="blog-write-container" style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button
                    className={`btn ${writing ? "btn-ghost" : "btn-primary"}`}
                    onClick={() => {
                        setWriting(!writing);
                        setStatus("");
                    }}
                >
                    {writing ? "← Makalelere Dön" : "✍️ Yeni Makale Yaz"}
                </button>
            </div>

            {writing && (
                <LoginPrompt label="Yazı göndermek için giriş yapın">
                    <form onSubmit={submit} className="panel blog-write-panel">
                        <div className="blog-write-header">
                            <h2>Yeni Parfüm Makalesi Oluştur</h2>
                            <p className="form-subtext">
                                Deneyimlerinizi, parfüm incelemelerinizi veya koku tüyolarınızı toplulukla paylaşın. Makaleniz onaylandıktan sonra blogda yayınlanacaktır.
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="b-title">Makale Başlığı *</label>
                            <input
                                id="b-title"
                                className="input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Örn: 2026 Sonbaharında Yükselen Amber ve Odunsu Notalar"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="b-cover">Kapak Görseli URL&apos;si (İsteğe bağlı)</label>
                            <input
                                id="b-cover"
                                className="input"
                                value={coverImageUrl}
                                onChange={(e) => setCoverImageUrl(e.target.value)}
                                placeholder="Örn: https://images.unsplash.com/... veya /blog_backgrounds/pictures_1_3.webp"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="b-body">Makale İçeriği (Zengin Metin / Markdown) *</label>
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Parfüm dünyasından düşüncelerinizi, notaları ve detayları buraya yazın..."
                                onOpenPreviewPage={handleOpenPreview}
                            />
                        </div>

                        <div className="blog-write-actions">
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleOpenPreview}
                                title="Makaleyi ayrı bir sayfada önizle"
                            >
                                👁️ Ayrı Sayfada Önizle
                            </button>
                            <button className="btn btn-primary" disabled={sending || !title.trim() || !content.trim()}>
                                <Icon name="send" size={14} /> {sending ? "Gönderiliyor..." : "Taslak Olarak Gönder"}
                            </button>
                        </div>

                        {status && (
                            <p className={`form-note ${status.includes("başarıyla") ? "ok" : "err"}`} style={{ marginTop: "1rem" }}>
                                {status}
                            </p>
                        )}
                    </form>
                </LoginPrompt>
            )}
        </div>
    );
}
