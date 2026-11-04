import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import BlogWriteSection from "@/components/BlogWriteSection";
import { formatDate, mediaUrl, blogHref } from "@/lib/urls";
import { apiFetch } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";
import { GUIDE_CATEGORY } from "@/lib/constants";

export const metadata: Metadata = pageMetadata({
    title: "Blog - Parfüm Dünyasından Rehberler ve İncelemeler",
    description: "Parfüm dünyasından rehberler, nota analizleri, kullanım ipuçları ve parfüm incelemeleri.",
    path: blogHref(),
});

interface BlogPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    coverImageUrl?: string;
    category?: string | null;
    viewCount?: number;
    publishedAt: string;
    authorName: string;
}

function BlogCard({ post, showExcerpt = true }: { post: BlogPost; showExcerpt?: boolean }) {
    return (
        <Link href={blogHref(post.slug)} className="blog-card">
            <div className="blog-cover">
                <img
                    src={mediaUrl(post.coverImageUrl) || "/blog_backgrounds/parfum-dunyasinda-2026-sonbahari.webp"}
                    alt={`${post.title} - blog kapak görseli`}
                    loading="lazy"
                />
            </div>
            <div className="blog-body">
                <div className="blog-meta">
                    <span>{formatDate(post.publishedAt)}</span>
                    <span>{post.authorName}</span>
                    {typeof post.viewCount === "number" && (
                        <span className="blog-card-views" title="Görüntülenme sayısı">
                            👁️ {post.viewCount}
                        </span>
                    )}
                </div>
                <h2 className="blog-title">{post.title}</h2>
                {showExcerpt && <p className="blog-excerpt">{post.excerpt}</p>}
            </div>
        </Link>
    );
}

export default async function BlogPage() {
    let blogs: BlogPost[] = [];
    try {
        const res = await apiFetch(`/api/blogs`, { next: { revalidate: 60 } });
        if (res.ok) blogs = await res.json();
    } catch {
        blogs = [];
    }

    // API yazıları en yeniden eskiye döndürür; rehberler de bu sırayla, genel bakış yazısı başta listelenir.
    const guides = blogs.filter((b) => b.category === GUIDE_CATEGORY);
    const posts = blogs.filter((b) => b.category !== GUIDE_CATEGORY);

    return (
        <div className="blog-index-page">
            <PageBreadcrumb trail={[{ label: "Blog" }]} />

            <div className="section-head">
                <h1 className="page-title">Blog</h1>
            </div>

            <BlogWriteSection />

            {posts.length > 0 ? (
                <div className="blog-grid">
                    {posts.map((b) => (
                        <BlogCard key={b.slug} post={b} />
                    ))}
                </div>
            ) : (
                guides.length === 0 && <p className="empty">Henüz yayınlanmış yazı yok.</p>
            )}

            {/* Kullanım rehberleri yazıların altında ayrı bir ızgarada durur; yazı ızgarasında tekrar görünmez. */}
            {guides.length > 0 && (
                <section className="section guide-pane" id="kullanim-rehberi" aria-labelledby="guide-pane-title">
                    <div className="section-head">
                        <h2 className="section-title" id="guide-pane-title">Site Kullanıcı Rehberi</h2>
                    </div>
                    <div className="blog-grid">
                        {guides.map((g) => (
                            <BlogCard key={g.slug} post={g} showExcerpt={false} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
