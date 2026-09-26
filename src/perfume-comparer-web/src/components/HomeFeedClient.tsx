"use client";

import { useState, useEffect, useRef } from "react";
import { PerfumeCard, type PerfumeCardData } from "./PerfumeCard";
import HorizontalSlider from "./HorizontalSlider";
import ComparisonCard, { type ComparisonPairData } from "./ComparisonCard";
import BlogSlider, { type BlogPost } from "./BlogSlider";
import BrandCard, { type BrandCardData } from "./BrandCard";
import { API_BASE, brandHref, localeHref, searchHref } from "@/lib/urls";
import { useGenderPref } from "@/lib/stores";
import Link from "next/link";
import Icon from "./Icon";

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
    const { gender, ready: genderReady } = useGenderPref();
    const mountedRef = useRef(false);
    const prevGenderRef = useRef<string | null>(initialGender ?? null);

    useEffect(() => {
        if (!genderReady) return;

        // İlk renderda sunucu verisi (initialData) zaten çerezdeki cinsiyete göre getirilmiştir.
        // Asla ilk yüklemede tekrar istek atıp slider'daki kartları kullanıcının gözü önünde değiştirmeyiz!
        if (!mountedRef.current) {
            mountedRef.current = true;
            prevGenderRef.current = gender;
            return;
        }

        // Kullanıcı dropdown üzerinden cinsiyeti aktif olarak değiştirmediyse istek atma
        if (prevGenderRef.current === gender) {
            return;
        }

        prevGenderRef.current = gender;
        const g = gender && gender !== "all" ? `&gender=${gender}` : "";
        setIsFiltering(true);

        (async () => {
            try {
                const [
                    exploreRes,
                    popRes,
                    compRes,
                    newRes,
                    commRes,
                    votesRes,
                    topRes,
                ] = await Promise.all([
                    fetch(`${API_BASE}/api/perfumes?sort=random&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=views&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/compare/popular`),
                    fetch(`${API_BASE}/api/perfumes?sort=newest&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=comments&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=votes&randomPool=500&pageSize=20${g}`),
                    fetch(`${API_BASE}/api/perfumes?sort=rating&minVotes=500&randomPool=500&pageSize=20${g}`),
                ]);

                const [
                    exploreJson,
                    popJson,
                    compJson,
                    newJson,
                    commJson,
                    votesJson,
                    topJson,
                ] = await Promise.all([
                    exploreRes.ok ? exploreRes.json() : Promise.resolve(null),
                    popRes.ok ? popRes.json() : Promise.resolve(null),
                    compRes.ok ? compRes.json() : Promise.resolve(null),
                    newRes.ok ? newRes.json() : Promise.resolve(null),
                    commRes.ok ? commRes.json() : Promise.resolve(null),
                    votesRes.ok ? votesRes.json() : Promise.resolve(null),
                    topRes.ok ? topRes.json() : Promise.resolve(null),
                ]);

                setData((prev) => ({
                    ...prev,
                    explorePerfumes: exploreJson?.items ?? prev.explorePerfumes,
                    popularPerfumes: popJson?.items ?? prev.popularPerfumes,
                    comparisons: compJson ?? prev.comparisons,
                    newestPerfumes: newJson?.items ?? prev.newestPerfumes,
                    mostCommentedPerfumes: commJson?.items ?? prev.mostCommentedPerfumes,
                    mostRatedPerfumes: votesJson?.items ?? prev.mostRatedPerfumes,
                    topRatedPerfumes: topJson?.items ?? prev.topRatedPerfumes,
                }));
            } catch {
                /* hata durumunda mevcut veri korunur */
            } finally {
                setIsFiltering(false);
            }
        })();
    }, [gender, genderReady]);

    const gParam = gender && gender !== "all" ? `&gender=${gender}` : "";

    return (
        <div className="home-layout">
            {/* 1. Üst Blog Hero Slider'ı */}
            {data.blogs.length > 0 && <BlogSlider blogs={data.blogs} />}

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

            {/* 3. Popüler Parfümler (En İyi 500 Havuzundan Rastgele 20) */}
            {(isFiltering || data.popularPerfumes.length > 0) && (
                <HorizontalSlider
                    title="Popüler Parfümler"
                    viewAllHref={`${searchHref({ sort: "views" })}${gParam}`}
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
        </div>
    );
}
