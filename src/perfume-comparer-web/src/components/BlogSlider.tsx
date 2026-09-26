"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { formatDate, API_BASE, mediaUrl, blogHref } from "@/lib/urls";

export interface BlogPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    coverImageUrl?: string;
    publishedAt: string;
    authorName: string;
}

/**
 * Yazının kendi kapak görseli yoksa kullanılacak arka planlar. API'nin wwwroot'undan
 * servis edilir; slayt sırasına göre dönerek her yazıya farklı bir zemin düşer.
 */
const FALLBACK_BACKGROUNDS = [
    "/blog_backgrounds/parfum-dunyasinda-2026-sonbahari.webp",
    "/blog_backgrounds/kokunun-6000-yillik-yolculugu.webp",
    "/blog_backgrounds/parfum-lugati.webp",
    "/blog_backgrounds/turkiyede-muadil-parfum-pazari-2026.webp",
    "/blog_backgrounds/francis-kurkdjian.webp",
];

export default function BlogSlider({ blogs }: { blogs: BlogPost[] }) {
    const displayBlogs = (blogs || []).slice(0, 5);
    const [currentIdx, setCurrentIdx] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const nextSlide = () => {
        if (displayBlogs.length === 0) return;
        setCurrentIdx((prev) => (prev + 1) % displayBlogs.length);
    };

    const prevSlide = () => {
        if (displayBlogs.length === 0) return;
        setCurrentIdx((prev) => (prev - 1 + displayBlogs.length) % displayBlogs.length);
    };

    useEffect(() => {
        if (displayBlogs.length <= 1) return;
        timeoutRef.current = setTimeout(() => {
            nextSlide();
        }, 6000);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentIdx, displayBlogs.length]);

    if (!displayBlogs || displayBlogs.length === 0) return null;

    const current = displayBlogs[currentIdx] || displayBlogs[0];
    const background = current.coverImageUrl
        ? mediaUrl(current.coverImageUrl)
        : `${API_BASE}${FALLBACK_BACKGROUNDS[currentIdx % FALLBACK_BACKGROUNDS.length]}`;

    return (
        <section className="hero-blog-slider">
            {displayBlogs.map((b, idx) => (
                <div
                    key={b.id}
                    className={`hero-blog-bg${idx === currentIdx ? " is-active" : ""}`}
                    style={{
                        backgroundImage: `url(${idx === currentIdx
                            ? background
                            : b.coverImageUrl
                                ? mediaUrl(b.coverImageUrl)
                                : `${API_BASE}${FALLBACK_BACKGROUNDS[idx % FALLBACK_BACKGROUNDS.length]}`})`,
                    }}
                    aria-hidden="true"
                />
            ))}

            <div className="hero-blog-slide">
                <div className="hero-blog-content">
                    <div className="hero-blog-meta">
                        <span className="hero-blog-badge">Öne çıkan rehber</span>
                        <span className="hero-blog-author">{current.authorName}</span>
                        <span>•</span>
                        <span>{formatDate(current.publishedAt)}</span>
                    </div>
                    <Link href={blogHref(current.slug)} className="hero-blog-title-link">
                        <h2 className="hero-blog-title">{current.title}</h2>
                    </Link>
                    <p className="hero-blog-excerpt">{current.excerpt}</p>
                    <Link href={blogHref(current.slug)} className="hero-blog-btn">
                        Yazıyı Oku <Icon name="arrow-right" size={14} />
                    </Link>
                </div>
            </div>

            <button
                type="button"
                className="hero-blog-nav hero-blog-prev"
                onClick={prevSlide}
                aria-label="Önceki Yazı"
            >
                <Icon name="arrow-left" size={18} />
            </button>
            <button
                type="button"
                className="hero-blog-nav hero-blog-next"
                onClick={nextSlide}
                aria-label="Sonraki Yazı"
            >
                <Icon name="arrow-right" size={18} />
            </button>

            <div className="hero-blog-dots">
                <span className="hero-blog-count">
                    {currentIdx + 1} / {displayBlogs.length}
                </span>
                {displayBlogs.map((_, idx) => (
                    <button
                        key={idx}
                        type="button"
                        className={`hero-blog-dot ${idx === currentIdx ? "active" : ""}`}
                        onClick={() => setCurrentIdx(idx)}
                        aria-label={`Slayt ${idx + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
