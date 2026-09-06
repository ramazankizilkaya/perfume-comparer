import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import BlogWriteSection from "@/components/BlogWriteSection";
import { API_BASE, formatDate } from "@/lib/urls";

export const metadata: Metadata = {
    title: "Blog - Parfüm Dünyasından Rehberler ve İncelemeler | Aura Compare",
    description: "Parfüm dünyasından rehberler, nota analizleri, kullanım ipuçları ve parfüm incelemeleri.",
};

interface BlogPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    coverImageUrl?: string;
    publishedAt: string;
    authorName: string;
}

export default async function BlogPage() {
    let blogs: BlogPost[] = [];
    try {
        const res = await fetch(`${API_BASE}/api/blogs`, { next: { revalidate: 60 } });
        if (res.ok) blogs = await res.json();
    } catch {
        blogs = [];
    }

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Blog" }]} />

            <div className="section-head">
                <div>
                    <span className="eyebrow">Koku rehberi</span>
                    <h1 className="page-title">Blog</h1>
                    <p className="section-desc">Parfüm dünyasından rehberler, incelemeler ve ipuçları.</p>
                </div>
            </div>

            <BlogWriteSection />

            {blogs.length > 0 ? (
                <div className="blog-grid">
                    {blogs.map((b) => (
                        <Link key={b.slug} href={`/blog/${b.slug}`} className="blog-card">
                            <div className="blog-cover">
                                <img src={b.coverImageUrl} alt="" loading="lazy" />
                            </div>
                            <div className="blog-body">
                                <div className="blog-meta">
                                    <span>{formatDate(b.publishedAt)}</span>
                                    <span>{b.authorName}</span>
                                </div>
                                <h2 className="blog-title">{b.title}</h2>
                                <p className="blog-excerpt">{b.excerpt}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="empty">Henüz yayınlanmış yazı yok.</p>
            )}
        </>
    );
}
