import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import RichTextRenderer from "@/components/RichTextRenderer";
import { formatDate, mediaUrl, blogHref, localeHref, searchHref } from "@/lib/urls";
import { apiError, apiFetch } from "@/lib/api";
import { absoluteUrl, jsonLd, LOGO_URL, pageMetadata, SITE_NAME, truncateDescription } from "@/lib/seo";
import { GUIDE_CATEGORY } from "@/lib/constants";

interface BlogPostDetail {
    id: number;
    title: string;
    slug: string;
    body: string;
    excerpt?: string;
    coverImageUrl?: string;
    category?: string | null;
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
    if (!slug) notFound();

    const res = await apiFetch(`/api/blogs/${slug}`, { next: { revalidate: 60 } });
    if (res.status === 404) notFound();
    if (!res.ok) throw apiError(res, "API hatası");
    const blog: BlogPostDetail = await res.json();

    return pageMetadata({
        title: blog.title,
        description: truncateDescription(blog.excerpt || blog.body || blog.title),
        path: blogHref(blog.slug),
        images: [mediaUrl(blog.coverImageUrl)],
        type: "article",
        publishedTime: blog.publishedAt,
    });
}

export default async function BlogDetailPage({ params }: PageProps) {
    const { slug } = await params;

    // Her ziyarette DB görüntülenme sayısının artması için no-store ile çağırıyoruz
    const res = await apiFetch(`/api/blogs/${slug}`, { cache: "no-store" });
    // Yazı yoksa 404; API hatasında 500 (geçici kesinti "sayfa silindi" sayılmasın).
    if (res.status === 404) notFound();
    if (!res.ok) throw apiError(res, "Blog yazısı alınamadı");
    const blog: BlogPostDetail = await res.json();

    const wordCount = blog.body ? blog.body.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const articleUrl = absoluteUrl(blogHref(blog.slug));
    const coverUrl = mediaUrl(blog.coverImageUrl);
    const jsonLdArticle = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: blog.title,
        description: truncateDescription(blog.excerpt || blog.body || blog.title),
        ...(coverUrl ? { image: [coverUrl] } : {}),
        ...(blog.publishedAt ? { datePublished: blog.publishedAt } : {}),
        inLanguage: "tr-TR",
        wordCount,
        mainEntityOfPage: articleUrl,
        url: articleUrl,
        author: { "@type": "Person", name: blog.authorName || SITE_NAME },
        publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: LOGO_URL },
        },
    };
    const jsonLdBreadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Anasayfa", item: absoluteUrl(localeHref("/")) },
            { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl(blogHref()) },
            { "@type": "ListItem", position: 3, name: blog.title, item: articleUrl },
        ],
    };

    return (
        <div className="blog-article-container">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdArticle) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdBreadcrumb) }} />
            <PageBreadcrumb
                trail={[
                    { label: "Blog", href: blogHref() },
                    { label: blog.title },
                ]}
            />

            <article className="article article-wide">
                {blog.coverImageUrl && (
                    <div className="article-cover-wrapper">
                        <img
                            className="article-cover"
                            src={mediaUrl(blog.coverImageUrl)}
                            alt={`${blog.title} - blog kapak görseli`}
                        />
                    </div>
                )}

                <header className="article-header">
                    <div className="article-kicker-row">
                        <span className="article-kicker">
                            {blog.category === GUIDE_CATEGORY ? "Site Kullanıcı Rehberi" : "Parfüm Rehberi & İnceleme"}
                        </span>
                    </div>

                    <h1 className="article-title">{blog.title}</h1>

                    <div className="article-meta-bar">
                        <div className="meta-author-group">
                            <div className="meta-avatar">
                                {(blog.authorName || SITE_NAME).slice(0, 2).toLocaleUpperCase("tr")}
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
                                {(blog.authorName || SITE_NAME).slice(0, 2).toLocaleUpperCase("tr")}
                            </div>
                            <div className="footer-bio">
                                <h4>{blog.authorName}</h4>
                                {/* Yazar metni sabit bir unvan değil, yazarın verisinden kurulur. */}
                                <p>{blog.authorName}, {SITE_NAME} için parfüm rehberleri ve koku incelemeleri kaleme alıyor.</p>
                            </div>
                        </div>

                        <div className="article-footer-nav">
                            <Link href={blogHref()} className="btn btn-outline">
                                ← Tüm Blog Yazılarına Dön
                            </Link>
                            <Link href={searchHref()} className="btn btn-primary">
                                Parfümleri Keşfet ve Karşılaştır →
                            </Link>
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    );
}
