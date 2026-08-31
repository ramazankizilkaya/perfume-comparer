"use client";

import { useState, useEffect } from "react";
import { PerfumeCard, type PerfumeCardData } from "@/components/PerfumeCard";
import HorizontalSlider from "@/components/HorizontalSlider";
import ComparisonCard, { type ComparisonPairData } from "@/components/ComparisonCard";
import BlogSlider, { type BlogPost } from "@/components/BlogSlider";
import { API_BASE } from "@/lib/urls";
import { useGenderPref } from "@/lib/stores";

export default function Home() {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [popularPerfumes, setPopularPerfumes] = useState<PerfumeCardData[]>([]);
    const [comparisons, setComparisons] = useState<ComparisonPairData[]>([]);
    const [newestPerfumes, setNewestPerfumes] = useState<PerfumeCardData[]>([]);
    const [mostCommentedPerfumes, setMostCommentedPerfumes] = useState<PerfumeCardData[]>([]);
    const [mostRatedPerfumes, setMostRatedPerfumes] = useState<PerfumeCardData[]>([]);
    const [topRatedPerfumes, setTopRatedPerfumes] = useState<PerfumeCardData[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const { gender, ready: genderReady } = useGenderPref();

    useEffect(() => {
        if (!genderReady) return;
        setLoading(true);
        (async () => {
            try {
                const g = gender && gender !== "all" ? `&gender=${gender}` : "";
                
                const [
                    blogsRes,
                    popRes,
                    compRes,
                    newRes,
                    commRes,
                    votesRes,
                    topRes,
                ] = await Promise.all([
                    fetch(`${API_BASE}/api/blogs`),
                    fetch(`${API_BASE}/api/perfumes?sort=views&pageSize=12${g}`),
                    fetch(`${API_BASE}/api/compare/popular`),
                    fetch(`${API_BASE}/api/perfumes?sort=newest&pageSize=12${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=comments&pageSize=12${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=votes&pageSize=12${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=rating&minVotes=500&pageSize=12${g}`),
                ]);

                if (blogsRes.ok) setBlogs(await blogsRes.json());
                if (popRes.ok) setPopularPerfumes((await popRes.json()).items ?? []);
                if (compRes.ok) setComparisons(await compRes.json());
                if (newRes.ok) setNewestPerfumes((await newRes.json()).items ?? []);
                if (commRes.ok) setMostCommentedPerfumes((await commRes.json()).items ?? []);
                if (votesRes.ok) setMostRatedPerfumes((await votesRes.json()).items ?? []);
                if (topRes.ok) setTopRatedPerfumes((await topRes.json()).items ?? []);
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
                <p>Parfümler ve listeler yükleniyor...</p>
            </div>
        );
    }

    if (failed && popularPerfumes.length === 0) {
        return (
            <div className="state">
                <h2>Veriler yüklenemedi</h2>
                <p>API&apos;ye ulaşılamadı. Sunucunun çalıştığından emin olun.</p>
            </div>
        );
    }

    const gParam = gender && gender !== "all" ? `&gender=${gender}` : "";

    return (
        <div className="home-layout">
            {/* 1. Üst Blog Hero Slider'ı */}
            {blogs.length > 0 && <BlogSlider blogs={blogs} />}

            {/* 2. Popüler Parfümler */}
            {popularPerfumes.length > 0 && (
                <HorizontalSlider
                    title="Popüler Parfümler"
                    viewAllHref={`/ara?sort=views${gParam}`}
                >
                    {popularPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 3. Popüler Karşılaştırmalar */}
            {comparisons.length > 0 && (
                <HorizontalSlider
                    title="Popüler Karşılaştırmalar"
                    viewAllHref="/karsilastir"
                >
                    {comparisons.map((c, idx) => (
                        <div key={`${c.perfume1.slug}-${c.perfume2.slug}-${idx}`} className="slider-item slider-item-compare">
                            <ComparisonCard pair={c} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 4. Yeni Gelenler */}
            {newestPerfumes.length > 0 && (
                <HorizontalSlider
                    title="Yeni Gelenler"
                    viewAllHref={`/ara?sort=newest${gParam}`}
                >
                    {newestPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 5. En Çok Yorum Alanlar */}
            {mostCommentedPerfumes.length > 0 && (
                <HorizontalSlider
                    title="En Çok Yorum Alanlar"
                    viewAllHref={`/ara?sort=comments${gParam}`}
                >
                    {mostCommentedPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 6. En Çok Değerlendirilenler */}
            {mostRatedPerfumes.length > 0 && (
                <HorizontalSlider
                    title="En Çok Değerlendirilenler"
                    viewAllHref={`/ara?sort=votes${gParam}`}
                >
                    {mostRatedPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 7. En Yüksek Puanlılar */}
            {topRatedPerfumes.length > 0 && (
                <HorizontalSlider
                    title="En Yüksek Puanlılar"
                    viewAllHref={`/ara?sort=rating${gParam}`}
                >
                    {topRatedPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}
        </div>
    );
}
