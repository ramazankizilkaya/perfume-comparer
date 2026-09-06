"use client";

import { useState, useEffect, useRef } from "react";
import { PerfumeCard, type PerfumeCardData } from "./PerfumeCard";
import HorizontalSlider from "./HorizontalSlider";
import ComparisonCard, { type ComparisonPairData } from "./ComparisonCard";
import BlogSlider, { type BlogPost } from "./BlogSlider";
import BrandCard, { type BrandCardData } from "./BrandCard";
import { API_BASE } from "@/lib/urls";
import { useGenderPref } from "@/lib/stores";

export interface HomeFeedData {
    blogs: BlogPost[];
    explorePerfumes: PerfumeCardData[];
    popularPerfumes: PerfumeCardData[];
    comparisons: ComparisonPairData[];
    randomBrands: BrandCardData[];
    newestPerfumes: PerfumeCardData[];
    mostCommentedPerfumes: PerfumeCardData[];
    mostRatedPerfumes: PerfumeCardData[];
    topRatedPerfumes: PerfumeCardData[];
}

export default function HomeFeedClient({ initialData }: { initialData: HomeFeedData }) {
    const [data, setData] = useState<HomeFeedData>(initialData);
    const { gender, ready: genderReady } = useGenderPref();
    const isInitialMount = useRef(true);

    useEffect(() => {
        // Sunucudan gelen veri varsayılan (all) filtrelidir.
        // Eğer kullanıcı farklı bir cinsiyet seçtiyse verileri filtreleyerek güncelle.
        if (isInitialMount.current) {
            isInitialMount.current = false;
            if (!gender || gender === "all") return;
        }

        if (!genderReady) return;
        const g = gender && gender !== "all" ? `&gender=${gender}` : "";

        (async () => {
            try {
                const [
                    blogsRes,
                    exploreRes,
                    popRes,
                    compRes,
                    brandsRes,
                    newRes,
                    commRes,
                    votesRes,
                    topRes,
                ] = await Promise.all([
                    fetch(`${API_BASE}/api/blogs`),
                    fetch(`${API_BASE}/api/perfumes?sort=random&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=views&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/compare/popular`),
                    fetch(`${API_BASE}/api/brands/random?count=20`),
                    fetch(`${API_BASE}/api/perfumes?sort=newest&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=comments&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=votes&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=rating&minVotes=500&randomPool=500&pageSize=20${g}`),
                ]);

                setData({
                    blogs: blogsRes.ok ? await blogsRes.json() : initialData.blogs,
                    explorePerfumes: exploreRes.ok ? (await exploreRes.json()).items ?? [] : [],
                    popularPerfumes: popRes.ok ? (await popRes.json()).items ?? [] : [],
                    comparisons: compRes.ok ? await compRes.json() : [],
                    randomBrands: brandsRes.ok ? await brandsRes.json() : initialData.randomBrands,
                    newestPerfumes: newRes.ok ? (await newRes.json()).items ?? [] : [],
                    mostCommentedPerfumes: commRes.ok ? (await commRes.json()).items ?? [] : [],
                    mostRatedPerfumes: votesRes.ok ? (await votesRes.json()).items ?? [] : [],
                    topRatedPerfumes: topRes.ok ? (await topRes.json()).items ?? [] : [],
                });
            } catch {
                /* hata durumunda mevcut veri korunur */
            }
        })();
    }, [gender, genderReady, initialData]);

    const gParam = gender && gender !== "all" ? `&gender=${gender}` : "";

    return (
        <div className="home-layout">
            {/* 1. Üst Blog Hero Slider'ı */}
            {data.blogs.length > 0 && <BlogSlider blogs={data.blogs} />}

            {/* 2. Keşfet (Rastgele Parfümler - Havuzsuz, Tüm Katalogdan) */}
            {data.explorePerfumes.length > 0 && (
                <HorizontalSlider
                    title="Keşfet"
                    viewAllHref={`/ara?sort=random${gParam}`}
                >
                    {data.explorePerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 3. Popüler Parfümler (En İyi 500 Havuzundan Rastgele 20) */}
            {data.popularPerfumes.length > 0 && (
                <HorizontalSlider
                    title="Popüler Parfümler"
                    viewAllHref={`/ara?sort=views${gParam}`}
                >
                    {data.popularPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 4. Popüler Karşılaştırmalar */}
            {data.comparisons.length > 0 && (
                <HorizontalSlider
                    title="Popüler Karşılaştırmalar"
                    viewAllHref="/karsilastir"
                >
                    {data.comparisons.map((c, idx) => (
                        <div key={`${c.perfume1.slug}-${c.perfume2.slug}-${idx}`} className="slider-item slider-item-compare">
                            <ComparisonCard pair={c} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 5. Rastgele Markalar Slider'ı */}
            {data.randomBrands.length > 0 && (
                <HorizontalSlider
                    title="Markalar"
                    viewAllHref="/marka"
                >
                    {data.randomBrands.map((b) => (
                        <div key={b.slug} className="slider-item slider-item-brand">
                            <BrandCard brand={b} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 6. Yeni Gelenler (En Yeni 500 Havuzundan Rastgele 20) */}
            {data.newestPerfumes.length > 0 && (
                <HorizontalSlider
                    title="Yeni Gelenler"
                    viewAllHref={`/ara?sort=newest${gParam}`}
                >
                    {data.newestPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 7. En Çok Yorum Alanlar (En Çok Yorumlu 500 Havuzundan Rastgele 20) */}
            {data.mostCommentedPerfumes.length > 0 && (
                <HorizontalSlider
                    title="En Çok Yorum Alanlar"
                    viewAllHref={`/ara?sort=comments${gParam}`}
                >
                    {data.mostCommentedPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 8. En Çok Değerlendirilenler (En Çok Oylu 500 Havuzundan Rastgele 20) */}
            {data.mostRatedPerfumes.length > 0 && (
                <HorizontalSlider
                    title="En Çok Değerlendirilenler"
                    viewAllHref={`/ara?sort=votes${gParam}`}
                >
                    {data.mostRatedPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* 9. En Yüksek Puanlılar (En Yüksek Puanlı 500 Havuzundan Rastgele 20) */}
            {data.topRatedPerfumes.length > 0 && (
                <HorizontalSlider
                    title="En Yüksek Puanlılar"
                    viewAllHref={`/ara?sort=rating${gParam}`}
                >
                    {data.topRatedPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}
        </div>
    );
}
