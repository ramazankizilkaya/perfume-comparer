"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { PerfumeCard, PerfumeRank, type PerfumeCardData } from "@/components/PerfumeCard";
import { API_BASE, formatDate } from "@/lib/urls";
import { useGenderPref } from "@/lib/stores";

interface BlogPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    coverImageUrl?: string;
    publishedAt: string;
    authorName: string;
}

const FAMILIES: { label: string; slug: string }[] = [
    { label: "Oryantal", slug: "oryantal" },
    { label: "Odunsu", slug: "odunsu" },
    { label: "Ferah", slug: "ferah" },
    { label: "Çiçeksi", slug: "ciceksi" },
    { label: "Narenciye", slug: "narenciye" },
    { label: "Aromatik", slug: "aromatik" },
    { label: "Gurme", slug: "gurme" },
    { label: "Fujer", slug: "fujer" },
];

export default function Home() {
    const [perfumes, setPerfumes] = useState<PerfumeCardData[]>([]);
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const { gender, ready: genderReady } = useGenderPref();

    useEffect(() => {
        if (!genderReady) return;
        setLoading(true);
        (async () => {
            try {
                const g = gender && gender !== "all" ? `&gender=${gender}` : "";
                const [pRes, bRes] = await Promise.all([
                    fetch(`${API_BASE}/api/perfumes?pageSize=24${g}`),
                    fetch(`${API_BASE}/api/blogs`),
                ]);

                if (!pRes.ok) throw new Error("perfumes");
                setPerfumes((await pRes.json()).items ?? []);
                if (bRes.ok) setBlogs(await bRes.json());
            } catch {
                setFailed(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [gender, genderReady]);

    if (loading) {
        return (
            <div className="state">
                <div className="spinner" />
                <p>Yükleniyor…</p>
            </div>
        );
    }

    if (failed || perfumes.length === 0) {
        return (
            <div className="state">
                <h2>Veriler yüklenemedi</h2>
                <p>API&apos;ye ulaşılamadı. Sunucunun çalıştığından emin olun.</p>
            </div>
        );
    }

    const popular = [...perfumes].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 12);
    const mostRated = [...perfumes].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 6);
    const topRated = [...perfumes].sort((a, b) => b.avgRating - a.avgRating).slice(0, 6);

    return (
        <>
            <PageBreadcrumb trail={[]} />

            <section className="intro">
                <span className="eyebrow">Bağımsız koku bilgi portalı</span>
                <h1 className="intro-title">
                    Parfümleri notasına, ailesine ve <em>karakterine</em> göre karşılaştırın
                </h1>
                <p className="intro-sub">
                    {perfumes.length}+ parfümün koku piramidini, mevsim ve yaş uyumunu, kullanıcı puanlarını
                    ve yorum özetlerini tek sayfada görün.
                </p>
                <div className="chip-nav">
                    {FAMILIES.map((f) => (
                        <Link key={f.slug} href={`/ara?family=${f.slug}`} className="chip">
                            {f.label}
                        </Link>
                    ))}
                </div>
            </section>

            <div className="home-grid">
                <div className="col-main">
                    <section>
                        <div className="section-head">
                            <div>
                                <h2 className="section-title">Popüler parfümler</h2>
                            </div>
                            <Link href="/ara" className="link-more">
                                Tümü <Icon name="arrow-right" size={13} />
                            </Link>
                        </div>
                        <div className="grid-cards">
                            {popular.map((p) => (
                                <PerfumeCard key={p.slug} perfume={p} />
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="col-aside">
                    <div>
                        <div className="section-head">
                            <h2 className="section-title">En çok değerlendirilen</h2>
                        </div>
                        <div className="rank">
                            {mostRated.map((p, i) => (
                                <PerfumeRank key={p.slug} perfume={p} rank={i + 1} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="section-head">
                            <h2 className="section-title">En yüksek puanlı</h2>
                        </div>
                        <div className="rank">
                            {topRated.map((p, i) => (
                                <PerfumeRank key={p.slug} perfume={p} rank={i + 1} />
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            {blogs.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <div>
                            <h2 className="section-title">Koku rehberi</h2>
                            <p className="section-desc">Parfüm dünyasından bilgi yazıları ve ipuçları.</p>
                        </div>
                        <Link href="/blog" className="link-more">
                            Tüm yazılar <Icon name="arrow-right" size={13} />
                        </Link>
                    </div>
                    <div className="blog-grid">
                        {blogs.slice(0, 4).map((b) => (
                            <BlogCard key={b.slug} blog={b} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

function BlogCard({ blog }: { blog: BlogPost }) {
    return (
        <Link href={`/blog/${blog.slug}`} className="blog-card">
            <div className="blog-cover">
                <img src={blog.coverImageUrl} alt="" loading="lazy" />
            </div>
            <div className="blog-body">
                <div className="blog-meta">
                    <span>{formatDate(blog.publishedAt)}</span>
                    <span>{blog.authorName}</span>
                </div>
                <h3 className="blog-title">{blog.title}</h3>
                <p className="blog-excerpt">{blog.excerpt}</p>
            </div>
        </Link>
    );
}
