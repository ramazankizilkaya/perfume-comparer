"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import RichTextRenderer from "@/components/RichTextRenderer";
import { formatDate, mediaUrl } from "@/lib/urls";

interface DraftArticle {
    title: string;
    body: string;
    excerpt?: string;
    coverImageUrl?: string;
    authorName?: string;
}

export default function BlogPreviewPage() {
    const router = useRouter();
    const [draft, setDraft] = useState<DraftArticle | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const raw = sessionStorage.getItem("aura_blog_preview");
            if (raw) {
                const parsed = JSON.parse(raw);
                setDraft(parsed);
            }
        } catch {
            setDraft(null);
        }
    }, []);

    if (!mounted) return null;

    if (!draft || (!draft.title && !draft.body)) {
        return (
            <div className="state" style={{ padding: "4rem 1rem", textAlign: "center" }}>
                <h2>Önizlenecek Taslak Bulunamadı</h2>
                <p style={{ color: "var(--ink-muted)", marginTop: "0.5rem" }}>
                    Lütfen blog sayfasından bir makale yazıp &quot;Ayrı Sayfada Önizle&quot; butonuna tıklayın.
                </p>
                <Link href="/blog" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                    Blog Sayfasına Dön
                </Link>
            </div>
        );
    }

    const wordCount = draft.body ? draft.body.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
        <div className="blog-article-container">
            <div className="preview-top-banner">
                <div className="preview-banner-content">
                    <span className="preview-badge">🔍 TASLAK ÖNİZLEME</span>
                    <span className="preview-banner-text">Bu makale henüz kaydedilmedi veya yayınlanmadı. Sayfanın canlıda nasıl görüneceğini inceliyorsunuz.</span>
                </div>
                <div className="preview-banner-actions">
                    <button type="button" onClick={() => router.back()} className="btn btn-sm btn-outline">
                        ← Düzenlemeye Dön
                    </button>
                    <Link href="/blog" className="btn btn-sm btn-ghost">
                        Blog Listesi
                    </Link>
                </div>
            </div>

            <PageBreadcrumb
                trail={[
                    { label: "Blog", href: "/blog" },
                    { label: "Önizleme" },
                    { label: draft.title || "Başlıksız Makale" },
                ]}
            />

            <article className="article article-wide">
                {draft.coverImageUrl && (
                    <div className="article-cover-wrapper">
                        <img
                            className="article-cover"
                            src={mediaUrl(draft.coverImageUrl)}
                            alt={`${draft.title} makale kapak görseli`}
                        />
                    </div>
                )}

                <header className="article-header">
                    <span className="article-kicker">Editör Taslağı · Parfüm &amp; Trendler</span>
                    <h1 className="article-title">{draft.title || "Başlıksız Makale"}</h1>

                    <div className="article-meta-bar">
                        <div className="meta-author-group">
                            <div className="meta-avatar">
                                {(draft.authorName || "Yazar").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="meta-author-info">
                                <span className="meta-author-name">{draft.authorName || "Siz (Yazar)"}</span>
                                <span className="meta-date">{formatDate(new Date().toISOString())}</span>
                            </div>
                        </div>

                        <div className="meta-stats-group">
                            <span className="meta-stat-item" title="Tahmini okuma süresi">
                                <span className="meta-stat-icon">⏱️</span> {readingTime} dk okuma
                            </span>
                            <span className="meta-stat-item meta-view-badge" title="Görüntülenme Sayısı">
                                <span className="meta-stat-icon">👁️</span> 1 görüntülenme (önizleme)
                            </span>
                        </div>
                    </div>

                    {draft.excerpt && (
                        <div className="article-lead-box">
                            <p>{draft.excerpt}</p>
                        </div>
                    )}
                </header>

                <div className="article-body-wrapper">
                    <RichTextRenderer content={draft.body} />
                </div>

                <footer className="article-footer">
                    <div className="article-footer-card">
                        <h3>Taslağınızı beğendiniz mi?</h3>
                        <p>Düzenleme ekranına dönerek &quot;Taslak Olarak Gönder&quot; butonuna basıp admin onayına iletebilirsiniz.</p>
                        <button type="button" onClick={() => router.back()} className="btn btn-primary" style={{ marginTop: "1rem" }}>
                            ← Düzenlemeye Dön ve Gönder
                        </button>
                    </div>
                </footer>
            </article>
        </div>
    );
}
