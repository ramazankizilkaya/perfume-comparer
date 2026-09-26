"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import LoginPrompt from "@/components/LoginPrompt";
import Icon from "@/components/Icon";
import { API_BASE, formatDate, blogHref } from "@/lib/urls";
import { useAuth } from "@/lib/stores";

interface MyBlogPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    coverImageUrl?: string;
    publishedAt?: string;
    createdAt: string;
    status: "Draft" | "Pending" | "Published" | "Rejected";
    authorName: string;
}

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
    Published: { label: "Yayınlandı", badgeClass: "badge-success" },
    Pending: { label: "Onay Bekliyor", badgeClass: "badge-warn" },
    Draft: { label: "Taslak", badgeClass: "badge-muted" },
    Rejected: { label: "Reddedildi", badgeClass: "badge-danger" },
};

export default function MyBlogsPage() {
    const { user, token, ready } = useAuth();
    const [blogs, setBlogs] = useState<MyBlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ready || !token) {
            setLoading(false);
            return;
        }

        async function fetchMyBlogs() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/blogs/my`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "X-Requested-With": "XMLHttpRequest",
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    setBlogs(data);
                }
            } catch {
                setBlogs([]);
            } finally {
                setLoading(false);
            }
        }

        fetchMyBlogs();
    }, [ready, token]);

    return (
        <>
            <PageBreadcrumb trail={[{ label: "Blog", href: blogHref() }, { label: "Yazılarım" }]} />

            <div className="section-head">
                <div>
                    <span className="eyebrow">Yazar Paneli</span>
                    <h1 className="page-title">Yazılarım</h1>
                    <p className="section-desc">Toplulukla paylaştığınız makaleler ve onay durumları.</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link href={blogHref()} className="btn btn-primary btn-sm">
                        <Icon name="plus" size={14} /> Yeni Yazı Yaz
                    </Link>
                </div>
            </div>

            <LoginPrompt label="Yazılarınızı görüntülemek ve yeni yazı göndermek için giriş yapın.">
                {loading ? (
                    <p className="muted" style={{ padding: "2rem 0" }}>Yazılarınız yükleniyor…</p>
                ) : blogs.length > 0 ? (
                    <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                        {blogs.map((b) => {
                            const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, badgeClass: "badge-muted" };
                            return (
                                <div
                                    key={b.id}
                                    className="panel"
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: "1rem",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div style={{ minWidth: "260px", flex: 1 }}>
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                                            <span
                                                className={`badge ${statusInfo.badgeClass}`}
                                                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                                            >
                                                {statusInfo.label}
                                            </span>
                                            <span className="muted" style={{ fontSize: "0.78rem" }}>
                                                {formatDate(b.publishedAt || b.createdAt)}
                                            </span>
                                        </div>
                                        <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1.05rem" }}>
                                            {b.status === "Published" ? (
                                                <Link href={blogHref(b.slug)} style={{ color: "var(--ink)", textDecoration: "none" }}>
                                                    {b.title}
                                                </Link>
                                            ) : (
                                                b.title
                                            )}
                                        </h3>
                                        <p className="muted" style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                                            {b.excerpt}
                                        </p>
                                    </div>

                                    {b.status === "Published" && (
                                        <Link href={blogHref(b.slug)} className="btn btn-outline btn-sm">
                                            Yazıyı Gör <Icon name="arrow-right" size={13} />
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="panel center" style={{ padding: "3rem 1.5rem" }}>
                        <p className="muted" style={{ marginBottom: "1rem" }}>Henüz yayınlanmış veya onaya gönderilmiş bir yazınız bulunmuyor.</p>
                        <Link href={blogHref()} className="btn btn-primary">
                            İlk Yazınızı Gönderin
                        </Link>
                    </div>
                )}
            </LoginPrompt>
        </>
    );
}
