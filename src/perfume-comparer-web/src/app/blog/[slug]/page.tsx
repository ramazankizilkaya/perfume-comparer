import type { Metadata } from "next";
import Link from "next/link";
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
        const description = (blog.body || "").slice(0, 160).replace(/\n+/g, " ");

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
        const res = await fetch(`${API_BASE}/api/blogs/${slug}`, { next: { revalidate: 60 } });
        if (res.ok) blog = await res.json();
    } catch {
        blog = null;
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
