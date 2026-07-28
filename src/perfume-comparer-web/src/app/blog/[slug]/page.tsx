"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { API_BASE, formatDate } from "@/lib/urls";

interface BlogPostDetail {
    title: string;
    slug: string;
    body: string;
    coverImageUrl?: string;
    publishedAt: string;
    authorName: string;
}

export default function BlogDetailPage() {
    const { slug } = useParams() as { slug: string };
    const [blog, setBlog] = useState<BlogPostDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/blogs/${slug}`);
                setBlog(res.ok ? await res.json() : null);
            } catch {
                setBlog(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [slug]);

    if (loading) {
        return (
            <div className="state">
                <div className="spinner" />
                <p>Yükleniyor…</p>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="state">
                <h2>Yazı bulunamadı</h2>
                <Link href="/blog" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
                    Tüm yazılar
                </Link>
            </div>
        );
    }

    const paragraphs = (blog.body || "").split(/\n{2,}/).filter(Boolean);

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Blog", href: "/blog" }, { label: blog.title }]} />

            <article className="article">
                {blog.coverImageUrl && <img className="article-cover" src={blog.coverImageUrl} alt="" />}

                <h1 className="article-title">{blog.title}</h1>
                <div className="blog-meta">
                    <span>{formatDate(blog.publishedAt)}</span>
                    <span>{blog.authorName}</span>
                </div>

                <div className="article-body">
                    {paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}
                </div>
            </article>
        </>
    );
}
