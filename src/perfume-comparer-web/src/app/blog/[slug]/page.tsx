import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import RichTextRenderer from "@/components/RichTextRenderer";
import { API_BASE, formatDate, mediaUrl } from "@/lib/urls";

interface BlogPostDetail {
    id: number;
    title: string;
    slug: string;
    body: string;
    excerpt?: string;
    coverImageUrl?: string;
    viewCount: number;
    publishedAt: string;
    authorName: string;
    authorAvatar?: string;
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!slug) return { title: "Blog | Aura Compare" };

    try {
        const res = await fetch(`${API_BASE}/api/blogs/${slug}`, { next: { revalidate: 60 } });
        if (!res.ok) return { title: "Yazı Bulunamadı | Aura Compare" };
        const blog: BlogPostDetail = await res.json();

        const title = `${blog.title} | Aura Compare Blog`;
        const description = (blog.excerpt || blog.body || "").slice(0, 160).replace(/\n+/g, " ");

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images: blog.coverImageUrl ? [{ url: blog.coverImageUrl }] : [],
            },
        };
    } catch {
        return { title: "Blog | Aura Compare" };
    }
}

export default async function BlogDetailPage({ params }: PageProps) {
    const { slug } = await params;

    let blog: BlogPostDetail | null = null;
    try {
        // Her ziyarette DB görüntülenme sayısının artması için no-store ile çağırıyoruz
        const res = await fetch(`${API_BASE}/api/blogs/${slug}`, { cache: "no-store" });
        if (res.ok) blog = await res.json();
    } catch {
        blog = null;
    }

    if (!blog) {
        return (
            <div className="state" style={{ padding: "4rem 1rem", textAlign: "center" }}>
                <h2>Makale Bulunamadı</h2>
                <p style={{ color: "var(--ink-muted)", marginTop: "0.5rem" }}>
                    Aradığınız blog yazısı silinmiş veya yayından kaldırılmış olabilir.
                </p>
                <Link href="/blog" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                    Tüm Yazılara Göz At
                </Link>
            </div>
        );
    }

    const wordCount = blog.body ? blog.body.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
        <div className="blog-article-container">
            <PageBreadcrumb
                trail={[
                    { label: "Blog", href: "/blog" },
                    { label: blog.title },
                ]}
            />

            <article className="article article-wide">
                {blog.coverImageUrl && (
                    <div className="article-cover-wrapper">
                        <img
                            className="article-cover"
                            src={mediaUrl(blog.coverImageUrl)}
                            alt={`${blog.title} makale kapak görseli`}
                        />
                    </div>
                )}

                <header className="article-header">
                    <div className="article-kicker-row">
                        <span className="article-kicker">Parfüm Rehberi &amp; İnceleme</span>
                    </div>

                    <h1 className="article-title">{blog.title}</h1>

                    <div className="article-meta-bar">
                        <div className="meta-author-group">
                            <div className="meta-avatar">
                                {(blog.authorName || "Aura").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="meta-author-info">
                                <span className="meta-author-name">{blog.authorName}</span>
                                <span className="meta-date">{formatDate(blog.publishedAt)}</span>
                            </div>
                        </div>

                        <div className="meta-stats-group">
                            <span className="meta-stat-item" title="Tahmini okuma süresi">
                                <span className="meta-stat-icon">⏱️</span> {readingTime} dk okuma
                            </span>
                            <span className="meta-stat-item meta-view-badge" title="Görüntülenme Sayısı">
                                <span className="meta-stat-icon">👁️</span> {blog.viewCount || 1} görüntülenme
                            </span>
                        </div>
                    </div>

                    {blog.excerpt && (
                        <div className="article-lead-box">
                            <p>{blog.excerpt}</p>
                        </div>
                    )}
                </header>

                <div className="article-body-wrapper">
                    <RichTextRenderer content={blog.body} />
                </div>

                <footer className="article-footer">
                    <div className="article-footer-card">
                        <div className="footer-author-box">
                            <div className="footer-avatar">
                                {(blog.authorName || "Aura").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="footer-bio">
                                <h4>{blog.authorName}</h4>
                                <p>Aura Compare koku topluluğu editörü ve parfüm meraklısı.</p>
                            </div>
                        </div>

                        <div className="article-footer-nav">
                            <Link href="/blog" className="btn btn-outline">
                                ← Tüm Blog Yazılarına Dön
                            </Link>
                            <Link href="/ara" className="btn btn-primary">
                                Parfümleri Keşfet ve Karşılaştır →
                            </Link>
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    );
}
