"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import LoginPrompt from "@/components/LoginPrompt";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { API_BASE, formatDate } from "@/lib/urls";

interface BlogPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    coverImageUrl?: string;
    publishedAt: string;
    authorName: string;
}

export default function BlogPage() {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [writing, setWriting] = useState(false);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("");
    const [sending, setSending] = useState(false);

    const load = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/blogs`);
            if (res.ok) setBlogs(await res.json());
        } catch {
            /* yoksay */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSending(true);
        setStatus("");
        try {
            const res = await fetch(`${API_BASE}/api/blogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body: content }),
            });
            if (res.ok) {
                setStatus("Yazınız taslak olarak kaydedildi.");
                setTitle("");
                setContent("");
                await load();
            } else {
                setStatus("Yazı kaydedilemedi.");
            }
        } catch {
            setStatus("Bağlantı hatası.");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="state">
                <div className="spinner" />
                <p>Yükleniyor…</p>
            </div>
        );
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
                <button className="btn btn-ghost" onClick={() => { setWriting(!writing); setStatus(""); }}>
                    {writing ? "Yazılara dön" : "Yazı yaz"}
                </button>
            </div>

            {writing ? (
                <LoginPrompt label="Yazı göndermek için giriş yapın">
                    <form onSubmit={submit} className="panel" style={{ maxWidth: "68ch" }}>
                        <div className="form-group">
                            <label htmlFor="b-title">Başlık</label>
                            <input
                                id="b-title"
                                className="input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Örn: Yaz aylarında kalıcılığı artırmanın yolları"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="b-body">İçerik</label>
                            <textarea
                                id="b-body"
                                className="textarea"
                                style={{ minHeight: 220 }}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                            />
                        </div>
                        <button className="btn btn-primary" disabled={sending}>
                            <Icon name="send" size={14} /> Taslak olarak gönder
                        </button>
                        {status && <p className="form-note ok">{status}</p>}
                    </form>
                </LoginPrompt>
            ) : blogs.length > 0 ? (
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
