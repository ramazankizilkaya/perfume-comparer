"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { formatDate, API_BASE, mediaUrl } from "@/lib/urls";

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
    "/blog_backgrounds/pictures_1_3.webp",
    "/blog_backgrounds/pictures_1_4.webp",
    "/blog_backgrounds/pictures_1_5.webp",
    "/blog_backgrounds/pictures_1_8.webp",
    "/blog_backgrounds/pictures_1_9.webp",
];

export default function BlogSlider({ blogs }: { blogs: BlogPost[] }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const nextSlide = () => {
        setCurrentIdx((prev) => (prev + 1) % blogs.length);
    };

    const prevSlide = () => {
        setCurrentIdx((prev) => (prev - 1 + blogs.length) % blogs.length);
    };

    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            nextSlide();
        }, 6000);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentIdx, blogs.length]);

    if (!blogs || blogs.length === 0) return null;

    const current = blogs[currentIdx];
    const background = current.coverImageUrl
        ? mediaUrl(current.coverImageUrl)
        : `${API_BASE}${FALLBACK_BACKGROUNDS[currentIdx % FALLBACK_BACKGROUNDS.length]}`;

    return (
        <section className="hero-blog-slider">
            {blogs.map((b, idx) => (
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
                    <Link href={`/blog/${current.slug}`} className="hero-blog-title-link">
                        <h2 className="hero-blog-title">{current.title}</h2>
                    </Link>
                    <p className="hero-blog-excerpt">{current.excerpt}</p>
                    <Link href={`/blog/${current.slug}`} className="hero-blog-btn">
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
                    {currentIdx + 1} / {blogs.length}
                </span>
                {blogs.map((_, idx) => (
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
