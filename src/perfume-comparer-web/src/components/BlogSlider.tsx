"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { mediaUrl, blogHref } from "@/lib/urls";

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

/** Kendiliğinden geçiş aralığı (ms). Kullanıcı okurken slayt değişmesin diye yavaş tutulur. */
const AUTO_ADVANCE_MS = 8000;

export default function BlogSlider({ blogs }: { blogs: BlogPost[] }) {
    const displayBlogs = (blogs || []).slice(0, 5);
    const count = displayBlogs.length;
    const [currentIdx, setCurrentIdx] = useState(0);
    // Otomatik geçiş kuralları: imleç/odak üstündeyken durur, kullanıcı bir kez elle
    // geçiş yapınca kalıcı olarak kapanır, "hareketi azalt" tercihinde hiç çalışmaz.
    const [engaged, setEngaged] = useState(false);
    const [interacted, setInteracted] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const apply = () => setReducedMotion(mq.matches);
        apply();
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, []);

    const autoPlay = count > 1 && !engaged && !interacted && !reducedMotion;

    useEffect(() => {
        if (!autoPlay) return;
        const timer = setTimeout(() => {
            setCurrentIdx((prev) => (prev + 1) % count);
        }, AUTO_ADVANCE_MS);
        return () => clearTimeout(timer);
    }, [autoPlay, currentIdx, count]);

    const nextSlide = () => {
        if (count === 0) return;
        setInteracted(true);
        setCurrentIdx((prev) => (prev + 1) % count);
    };

    const prevSlide = () => {
        if (count === 0) return;
        setInteracted(true);
        setCurrentIdx((prev) => (prev - 1 + count) % count);
    };

    const goTo = (idx: number) => {
        setInteracted(true);
        setCurrentIdx(idx);
    };

    if (!displayBlogs || displayBlogs.length === 0) return null;

    const current = displayBlogs[currentIdx] || displayBlogs[0];
    const background = current.coverImageUrl
        ? mediaUrl(current.coverImageUrl)
        : mediaUrl(FALLBACK_BACKGROUNDS[currentIdx % FALLBACK_BACKGROUNDS.length]);

    return (
        <section
            className="hero-blog-slider"
            aria-roledescription="slayt gösterisi"
            onMouseEnter={() => setEngaged(true)}
            onMouseLeave={() => setEngaged(false)}
            onFocus={() => setEngaged(true)}
            onBlur={() => setEngaged(false)}
        >
            {displayBlogs.map((b, idx) => (
                <div
                    key={b.id}
                    className={`hero-blog-bg${idx === currentIdx ? " is-active" : ""}`}
                    style={{
                        backgroundImage: `url(${idx === currentIdx
                            ? background
                            : b.coverImageUrl
                                ? mediaUrl(b.coverImageUrl)
                                : mediaUrl(FALLBACK_BACKGROUNDS[idx % FALLBACK_BACKGROUNDS.length])})`,
                    }}
                    aria-hidden="true"
                />
            ))}

            <div className="hero-blog-slide">
                <div className="hero-blog-content">
                    <Link href={blogHref(current.slug)} className="hero-blog-title-link">
                        <h2 className="hero-blog-title">{current.title}</h2>
                    </Link>
                    <p className="hero-blog-excerpt">{current.excerpt}</p>
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
                        onClick={() => goTo(idx)}
                        aria-label={`Slayt ${idx + 1}`}
                        aria-current={idx === currentIdx ? "true" : undefined}
                    />
                ))}
            </div>
        </section>
    );
}
