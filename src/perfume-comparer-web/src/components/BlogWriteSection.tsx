"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import LoginPrompt from "./LoginPrompt";
import RichTextEditor from "./RichTextEditor";
import { API_BASE, blogPreviewHref, consumeUrlParam } from "@/lib/urls";
import { useAuth, authFetch } from "@/lib/stores";
import { convertFileToWebp } from "@/lib/imageWebp";
import { toast } from "@/lib/toast";

const TITLE_MAX = 200;

export default function BlogWriteSection() {
    const { user } = useAuth();
    const [writing, setWriting] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [coverImageUrl, setCoverImageUrl] = useState("");
    const [uploadingCover, setUploadingCover] = useState(false);
    const [status, setStatus] = useState("");
    const [sending, setSending] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (consumeUrlParam("write", "1")) {
            queueMicrotask(() => setWriting(true));
        }
    }, []);

    const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFile = e.target.files?.[0];
        if (!rawFile) return;
        e.target.value = "";
        setUploadingCover(true);
        try {
            const webpFile = await convertFileToWebp(rawFile);
            const formData = new FormData();
            formData.append("image", webpFile);
            const res = await authFetch(`${API_BASE}/api/blogs/upload-image`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.imageUrl) {
                throw new Error(data.message || "Kapak görseli yüklenemedi.");
            }
            setCoverImageUrl(data.imageUrl);
            toast.success("Kapak görseli WebP olarak yüklendi.");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Kapak görseli yüklenemedi.";
            toast.error(msg);
        } finally {
            setUploadingCover(false);
        }
    };

    const handleOpenPreview = () => {
        try {
            sessionStorage.setItem(
                "aura_blog_preview",
                JSON.stringify({
                    title: title || "Başlıksız Taslak Makale",
                    body: content || "İçerik henüz girilmedi.",
                    coverImageUrl:
                        coverImageUrl ||
                        "/blog_backgrounds/parfum-dunyasinda-2026-sonbahari.webp",
                    authorName: user?.name || user?.email || "Siz (Yazar)",
                })
            );
            window.open(blogPreviewHref(), "_blank");
        } catch (e) {
            console.error("Önizleme kaydedilemedi:", e);
        }
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSending(true);
        setStatus("");
        try {
            // authFetch oturum ve X-Requested-With başlıklarını ekler; 401'de oturumu temizler.
            const res = await authFetch(`${API_BASE}/api/blogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
                                maxLength={TITLE_MAX}
                                placeholder="Örn: 2026 Sonbaharında Yükselen Amber ve Odunsu Notalar"
                                required
                            />
                            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                                {title.length} / {TITLE_MAX}
                            </span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="b-cover">Kapak Görseli (WebP&apos;e dönüştürülür, isteğe bağlı)</label>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <input
                                    id="b-cover"
                                    className="input"
                                    style={{ flex: "1 1 220px" }}
                                    value={coverImageUrl}
                                    onChange={(e) => setCoverImageUrl(e.target.value)}
                                    maxLength={400}
                                    placeholder="Görsel URL'si girin veya bilgisayarınızdan yükleyin"
                                />
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleCoverFileSelect}
                                    style={{ display: "none" }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    disabled={uploadingCover}
                                    onClick={() => coverInputRef.current?.click()}
                                >
                                    <Icon name="plus" size={14} /> {uploadingCover ? "Yükleniyor…" : "Görsel Yükle (.webp)"}
                                </button>
                            </div>
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
