"use client";

import { useState, useEffect, useRef } from "react";
import { PerfumeCard, type PerfumeCardData } from "./PerfumeCard";
import HorizontalSlider from "./HorizontalSlider";
import ComparisonCard, { type ComparisonPairData } from "./ComparisonCard";
import BlogSlider, { type BlogPost } from "./BlogSlider";
import BrandCard, { type BrandCardData } from "./BrandCard";
import { API_BASE, brandHref, localeHref, searchHref } from "@/lib/urls";
import { useGenderPref, useRecentPerfumes } from "@/lib/stores";
import { openGenderPrompt } from "@/lib/genderPrompt";

export interface HomeFeedData {
    blogs: BlogPost[];
    explorePerfumes: PerfumeCardData[];
    popularPerfumes: PerfumeCardData[];
    mostViewedPerfumes: PerfumeCardData[];
    comparisons: ComparisonPairData[];
    randomBrands: BrandCardData[];
    newestPerfumes: PerfumeCardData[];
    mostCommentedPerfumes: PerfumeCardData[];
    mostRatedPerfumes: PerfumeCardData[];
    topRatedPerfumes: PerfumeCardData[];
}

function PerfumeCardSkeleton() {
    return (
        <div className="slider-item">
            <div className="perfume-card-skeleton">
                <div className="skeleton-shimmer skeleton-img" />
                <div className="skeleton-shimmer skeleton-text-sm" />
                <div className="skeleton-shimmer skeleton-text-md" />
                <div className="skeleton-shimmer skeleton-badge" />
            </div>
        </div>
    );
}

function SliderSkeletons({ count = 6 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <PerfumeCardSkeleton key={i} />
            ))}
        </>
    );
}

export default function HomeFeedClient({
    initialData,
    initialGender,
}: {
    initialData: HomeFeedData;
    initialGender?: string | null;
}) {
    const [data, setData] = useState<HomeFeedData>(initialData);
    const [isFiltering, setIsFiltering] = useState(false);
    const { gender, ready: genderReady, asked: genderAsked } = useGenderPref();
    const { items: recentPerfumes, ready: recentReady } = useRecentPerfumes();
    // Sunucu verisi (initialData) çerezdeki cinsiyete göre getirilmiştir. Tarayıcıdaki
    // tercih bununla aynıysa yeniden istek atılmaz; farklıysa (ilk ziyaret sorusu
    // cevaplandı ya da kullanıcı menüden değiştirdi) slider'lar yeni tercihle doldurulur.
    const prevGenderRef = useRef<string | null>(
        initialGender && initialGender !== "all" ? initialGender : null,
    );

    // Tercih yalnızca anasayfa listelerini etkiler; bu yüzden ilk ziyaret sorusu yalnızca anasayfada açılır.
    useEffect(() => {
        if (genderReady && !genderAsked) openGenderPrompt();
    }, [genderReady, genderAsked]);

    useEffect(() => {
        if (!genderReady) return;
        if (prevGenderRef.current === gender) return;

        prevGenderRef.current = gender;
        const g = gender && gender !== "all" ? `&gender=${gender}` : "";
        // Cinsiyet hızlı değiştirilirse önceki istekler iptal edilir; eski cevap yeni listenin üstüne yazılmaz.
        const controller = new AbortController();
        const { signal } = controller;

        (async () => {
            setIsFiltering(true);
            try {
                const [
                    exploreRes,
                    popRes,
                    viewedRes,
                    compRes,
                    newRes,
                    commRes,
                    votesRes,
                    topRes,
                ] = await Promise.all([
                    fetch(`${API_BASE}/api/perfumes?sort=random&pageSize=20${g}`, { signal }),
                    fetch(`${API_BASE}/api/perfumes?sort=trending&randomPool=100&pageSize=20${g}`, { signal }),
                    fetch(`${API_BASE}/api/perfumes?sort=views&pageSize=20${g}`, { signal }),
                    fetch(`${API_BASE}/api/compare/popular`, { signal }),
                    fetch(`${API_BASE}/api/perfumes?sort=newest&randomPool=100&pageSize=20${g}`, { signal }),
                    fetch(`${API_BASE}/api/perfumes?sort=comments&randomPool=100&pageSize=20${g}`, { signal }),
                    fetch(`${API_BASE}/api/perfumes?sort=votes&randomPool=100&pageSize=20${g}`, { signal }),
                    fetch(`${API_BASE}/api/perfumes?sort=rating&minVotes=500&randomPool=100&pageSize=20${g}`, { signal }),
                ]);

                const [
                    exploreJson,
                    popJson,
                    viewedJson,
                    compJson,
                    newJson,
                    commJson,
                    votesJson,
                    topJson,
                ] = await Promise.all([
                    exploreRes.ok ? exploreRes.json() : Promise.resolve(null),
                    popRes.ok ? popRes.json() : Promise.resolve(null),
                    viewedRes.ok ? viewedRes.json() : Promise.resolve(null),
                    compRes.ok ? compRes.json() : Promise.resolve(null),
                    newRes.ok ? newRes.json() : Promise.resolve(null),
                    commRes.ok ? commRes.json() : Promise.resolve(null),
                    votesRes.ok ? votesRes.json() : Promise.resolve(null),
                    topRes.ok ? topRes.json() : Promise.resolve(null),
                ]);

                if (signal.aborted) return;
                setData((prev) => ({
                    ...prev,
                    explorePerfumes: exploreJson?.items ?? prev.explorePerfumes,
                    popularPerfumes: popJson?.items ?? prev.popularPerfumes,
                    mostViewedPerfumes: viewedJson?.items ?? prev.mostViewedPerfumes,
                    comparisons: compJson ?? prev.comparisons,
                    newestPerfumes: newJson?.items ?? prev.newestPerfumes,
                    mostCommentedPerfumes: commJson?.items ?? prev.mostCommentedPerfumes,
                    mostRatedPerfumes: votesJson?.items ?? prev.mostRatedPerfumes,
                    topRatedPerfumes: topJson?.items ?? prev.topRatedPerfumes,
                }));
            } catch {
                /* hata ya da iptal durumunda mevcut veri korunur */
            } finally {
                if (!signal.aborted) setIsFiltering(false);
            }
        })();

        return () => controller.abort();
    }, [gender, genderReady]);

    const gParam = gender && gender !== "all" ? `&gender=${gender}` : "";

    return (
        <div className="home-layout">
            {/* Sayfanın tek H1'i: görsel olarak küçük tutulur (CSS: .home-page-title), slider'daki başlıklar h2 kalır. */}
            <div className="home-hero">
                <header className="home-page-head">
                    <h1 className="page-title home-page-title">Parfüm Karşılaştırma ve Koku Rehberi</h1>
                </header>

                {/* 1. Üst Blog Hero Slider'ı */}
                {data.blogs.length > 0 && <BlogSlider blogs={data.blogs} />}
            </div>

            {/* 2. Keşfet (Rastgele Parfümler - Havuzsuz, Tüm Katalogdan) */}
            {(isFiltering || data.explorePerfumes.length > 0) && (
                <HorizontalSlider
                    title="Keşfet"
                    viewAllHref={`${searchHref({ sort: "random" })}${gParam}`}
                >
                    {isFiltering ? (
                        <SliderSkeletons />
                    ) : (
                        data.explorePerfumes.map((p) => (
                            <div key={p.slug} className="slider-item">
                                <PerfumeCard perfume={p} />
                            </div>
                        ))
                    )}
                </HorizontalSlider>
            )}

            {/* 3. Popüler Parfümler (son 7 günün ziyaretine göre ilk 100'den rastgele 20) */}
            {(isFiltering || data.popularPerfumes.length > 0) && (
                <HorizontalSlider
                    title="Popüler Parfümler"
                    viewAllHref={`${searchHref({ sort: "trending" })}${gParam}`}
                >
                    {isFiltering ? (
                        <SliderSkeletons />
                    ) : (
                        data.popularPerfumes.map((p) => (
                            <div key={p.slug} className="slider-item">
                                <PerfumeCard perfume={p} />
                            </div>
                        ))
                    )}
                </HorizontalSlider>
            )}

            {/* 4. Popüler Karşılaştırmalar */}
            {data.comparisons.length > 0 && (
                <HorizontalSlider
                    title="Popüler Karşılaştırmalar"
                    viewAllHref={localeHref("/karsilastir")}
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
                    viewAllHref={brandHref()}
                >
                    {data.randomBrands.map((b) => (
                        <div key={b.slug} className="slider-item slider-item-brand">
                            <BrandCard brand={b} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}

            {/* En Çok Ziyaret Edilenler (tekil ziyaret sayısına göre ilk 20, sıralı) */}
            {(isFiltering || data.mostViewedPerfumes.length > 0) && (
                <HorizontalSlider
                    title="En Çok Ziyaret Edilenler"
                    viewAllHref={`${searchHref({ sort: "views" })}${gParam}`}
                >
                    {isFiltering ? (
                        <SliderSkeletons />
                    ) : (
                        data.mostViewedPerfumes.map((p) => (
                            <div key={p.slug} className="slider-item">
                                <PerfumeCard perfume={p} />
                            </div>
                        ))
                    )}
                </HorizontalSlider>
            )}

            {/* 6. Yeni Gelenler (En Yeni 500 Havuzundan Rastgele 20) */}
            {(isFiltering || data.newestPerfumes.length > 0) && (
                <HorizontalSlider
                    title="Yeni Gelenler"
                    viewAllHref={`${searchHref({ sort: "newest" })}${gParam}`}
                >
                    {isFiltering ? (
                        <SliderSkeletons />
                    ) : (
                        data.newestPerfumes.map((p) => (
                            <div key={p.slug} className="slider-item">
                                <PerfumeCard perfume={p} />
                            </div>
                        ))
                    )}
                </HorizontalSlider>
            )}

            {/* 7. En Çok Yorum Alanlar (En Çok Yorumlu 500 Havuzundan Rastgele 20) */}
            {(isFiltering || data.mostCommentedPerfumes.length > 0) && (
                <HorizontalSlider
                    title="En Çok Yorum Alanlar"
                    viewAllHref={`${searchHref({ sort: "comments" })}${gParam}`}
                >
                    {isFiltering ? (
                        <SliderSkeletons />
                    ) : (
                        data.mostCommentedPerfumes.map((p) => (
                            <div key={p.slug} className="slider-item">
                                <PerfumeCard perfume={p} />
                            </div>
                        ))
                    )}
                </HorizontalSlider>
            )}

            {/* 8. En Çok Değerlendirilenler (En Çok Oylu 500 Havuzundan Rastgele 20) */}
            {(isFiltering || data.mostRatedPerfumes.length > 0) && (
                <HorizontalSlider
                    title="En Çok Değerlendirilenler"
                    viewAllHref={`${searchHref({ sort: "votes" })}${gParam}`}
                >
                    {isFiltering ? (
                        <SliderSkeletons />
                    ) : (
                        data.mostRatedPerfumes.map((p) => (
                            <div key={p.slug} className="slider-item">
                                <PerfumeCard perfume={p} />
                            </div>
                        ))
                    )}
                </HorizontalSlider>
            )}

            {/* 9. En Yüksek Puanlılar (En Yüksek Puanlı 500 Havuzundan Rastgele 20) */}
            {(isFiltering || data.topRatedPerfumes.length > 0) && (
                <HorizontalSlider
                    title="En Yüksek Puanlılar"
                    viewAllHref={`${searchHref({ sort: "rating" })}${gParam}`}
                >
                    {isFiltering ? (
                        <SliderSkeletons />
                    ) : (
                        data.topRatedPerfumes.map((p) => (
                            <div key={p.slug} className="slider-item">
                                <PerfumeCard perfume={p} />
                            </div>
                        ))
                    )}
                </HorizontalSlider>
            )}

            {/* 10. Son Gezdiklerim */}
            {recentReady && recentPerfumes.length > 0 && (
                <HorizontalSlider title="Son Gezdiklerim">
                    {recentPerfumes.map((p) => (
                        <div key={p.slug} className="slider-item">
                            <PerfumeCard perfume={p} />
                        </div>
                    ))}
                </HorizontalSlider>
            )}
        </div>
    );
}
