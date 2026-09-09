"use client";

import { useRef } from "react";

interface StoreItem {
    name: string;
    tag: string;
    url: string;
    brandColor: string;
    textColor?: string;
    logoText: string;
    accentBorder?: string;
}

interface StoreGroup {
    id: string;
    title: string;
    seoSubtitle: string;
    icon: string;
    stores: StoreItem[];
}

function StoreSliderRow({
    group,
    perfumeName,
}: {
    group: StoreGroup;
    perfumeName: string;
}) {
    const trackRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (!trackRef.current) return;
        const scrollAmount = direction === "left" ? -320 : 320;
        trackRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    return (
        <div className="buy-slider-group" id={`fiyat-${group.id}`}>
            <div className="buy-slider-header">
                <div className="buy-slider-title-area">
                    <span className="buy-slider-icon" aria-hidden="true">
                        {group.icon}
                    </span>
                    <div>
                        <h3 className="buy-slider-title">{group.title}</h3>
                        <p className="buy-slider-subtitle">{group.seoSubtitle}</p>
                    </div>
                </div>
                <div className="buy-slider-nav" aria-label={`${group.title} kaydırma butonları`}>
                    <button
                        type="button"
                        onClick={() => scroll("left")}
                        className="buy-nav-btn"
                        aria-label="Önceki mağazalar"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => scroll("right")}
                        className="buy-nav-btn"
                        aria-label="Sonraki mağazalar"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="buy-slider-track-wrap">
                <div className="buy-slider-track" ref={trackRef}>
                    {group.stores.map((store, idx) => (
                        <a
                            key={idx}
                            href={store.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="buy-store-card"
                            title={`${perfumeName} için ${store.name} satış sayfasını yeni sekmede veya uygulamada aç`}
                        >
                            <div
                                className="buy-card-logo"
                                style={{
                                    backgroundColor: store.brandColor,
                                    color: store.textColor || "#FFFFFF",
                                    border: store.accentBorder ? `1px solid ${store.accentBorder}` : "none",
                                }}
                            >
                                <span className="buy-card-logo-text">{store.logoText}</span>
                            </div>
                            <div className="buy-card-content">
                                <span className="buy-card-name">{store.name}</span>
                                <div className="buy-card-footer">
                                    <span className="buy-card-tag">{store.tag}</span>
                                    <span className="buy-card-action">
                                        Fiyatı Gör
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="7" y1="17" x2="17" y2="7" />
                                            <polyline points="7 7 17 7 17 17" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function PerfumeWhereToBuySection({
    perfumeName,
    brandName,
}: {
    perfumeName: string;
    brandName: string;
}) {
    // Parfüm adı zaten marka adını içeriyorsa tekrar marka adı ekleme
    const cleanQuery = perfumeName.toLowerCase().includes(brandName.toLowerCase())
        ? perfumeName
        : `${brandName} ${perfumeName}`;
    const encoded = encodeURIComponent(cleanQuery.trim());

    const groups: StoreGroup[] = [
        {
            id: "guvenilir-saticilar",
            title: `Orijinal ${perfumeName} Satan Yetkili Parfümeriler`,
            seoSubtitle: `Türkiye resmi distribütör garantili orijinal ${perfumeName} parfüm satışı yapan yetkili butik ve zincir mağazalar`,
            icon: "🛡️",
            stores: [
                {
                    name: "Beymen",
                    tag: "Yetkili Butik",
                    url: `https://www.beymen.com/search?q=${encoded}`,
                    brandColor: "#1A1A1A",
                    textColor: "#F8F8F8",
                    logoText: "B E Y M E N",
                },
                {
                    name: "Sephora",
                    tag: "Yetkili Satıcı",
                    url: `https://www.sephora.com.tr/ara/?q=${encoded}`,
                    brandColor: "#050505",
                    textColor: "#FFFFFF",
                    logoText: "S E P H O R A",
                    accentBorder: "rgba(255, 255, 255, 0.25)",
                },
                {
                    name: "Boyner",
                    tag: "Yetkili Mağaza",
                    url: `https://www.boyner.com.tr/arama?q=${encoded}`,
                    brandColor: "#C9141D",
                    textColor: "#FFFFFF",
                    logoText: "BOYNER",
                },
                {
                    name: "Sevil Parfümeri",
                    tag: "Yetkili Parfümeri",
                    url: `https://www.sevil.com.tr/catalogsearch/result/?q=${encoded}`,
                    brandColor: "#0A3B66",
                    textColor: "#FFFFFF",
                    logoText: "SEVİL",
                },
            ],
        },
        {
            id: "pazaryerleri",
            title: `Pazaryerlerinde ${perfumeName} Fiyatları ve Kampanyaları`,
            seoSubtitle: `Trendyol, Hepsiburada ve N11 üzerindeki farklı satıcıların ${perfumeName} teklifleri ve kullanıcı yorumları`,
            icon: "🛍️",
            stores: [
                {
                    name: "Trendyol",
                    tag: "Pazaryeri",
                    url: `https://www.trendyol.com/sr?q=${encoded}`,
                    brandColor: "#E05A00",
                    textColor: "#FFFFFF",
                    logoText: "trendyol",
                },
                {
                    name: "Hepsiburada",
                    tag: "Pazaryeri",
                    url: `https://www.hepsiburada.com/ara?q=${encoded}`,
                    brandColor: "#FF6000",
                    textColor: "#FFFFFF",
                    logoText: "hepsiburada",
                },
                {
                    name: "N11",
                    tag: "Pazaryeri",
                    url: `https://www.n11.com/arama?q=${encoded}`,
                    brandColor: "#562382",
                    textColor: "#FFFFFF",
                    logoText: "n11",
                },
                {
                    name: "Çiçeksepeti",
                    tag: "Pazaryeri",
                    url: `https://www.ciceksepeti.com/arama?query=${encoded}`,
                    brandColor: "#0055A5",
                    textColor: "#FFFFFF",
                    logoText: "çiçeksepeti",
                },
                {
                    name: "PttAVM",
                    tag: "Pazaryeri",
                    url: `https://www.pttavm.com/arama/${encoded}`,
                    brandColor: "#F5A623",
                    textColor: "#1A1A1A",
                    logoText: "pttavm",
                },
            ],
        },
        {
            id: "muadil-markalar",
            title: `${perfumeName} Muadili Açık Parfüm Kodları ve Benzerleri`,
            seoSubtitle: `${perfumeName} koku piramidine en yakın esans formülasyonuna sahip yerli muadil açık parfüm alternatifleri`,
            icon: "🧪",
            stores: [
                {
                    name: "Muscent",
                    tag: "Özel Niche Muadil",
                    url: `https://muscent.com.tr/search?q=${encoded}`,
                    brandColor: "#243342",
                    textColor: "#FFFFFF",
                    logoText: "MUSCENT",
                },
                {
                    name: "Mad Parfüm",
                    tag: "Açık Parfüm Kodu",
                    url: `https://www.madparfum.com/arama?q=${encoded}`,
                    brandColor: "#800F1F",
                    textColor: "#FFFFFF",
                    logoText: "MAD PARFÜM",
                },
                {
                    name: "Bargello",
                    tag: "Açık Parfüm Kodu",
                    url: `https://www.bargello.com.tr/arama?q=${encoded}`,
                    brandColor: "#0F2847",
                    textColor: "#FFFFFF",
                    logoText: "BARGELLO",
                },
                {
                    name: "Loris",
                    tag: "Açık Parfüm Kodu",
                    url: `https://www.lorisparfum.com/arama?q=${encoded}`,
                    brandColor: "#B32417",
                    textColor: "#FFFFFF",
                    logoText: "LORİS",
                },
                {
                    name: "D&P Perfumum",
                    tag: "Açık Parfüm Kodu",
                    url: `https://www.dpparfum.com.tr/arama?q=${encoded}`,
                    brandColor: "#0F6E60",
                    textColor: "#FFFFFF",
                    logoText: "D&P PERFUMUM",
                },
                {
                    name: "David Walker",
                    tag: "Açık Parfüm Kodu",
                    url: `https://www.davidwalker.com.tr/arama?q=${encoded}`,
                    brandColor: "#1C2833",
                    textColor: "#FFFFFF",
                    logoText: "DAVID WALKER",
                },
            ],
        },
        {
            id: "fiyat-karsilastirma",
            title: `En Ucuz ${perfumeName} Fiyatını Bul: Karşılaştırma Portalları`,
            seoSubtitle: `Akakçe ve Cimri üzerinden tüm satıcıların güncel ${perfumeName} fiyat geçmişini ve en ucuz tekliflerini kıyaslayın`,
            icon: "📊",
            stores: [
                {
                    name: "Akakçe",
                    tag: "Fiyat Karşılaştır",
                    url: `https://www.akakce.com/arama/?q=${encoded}`,
                    brandColor: "#004B87",
                    textColor: "#FFFFFF",
                    logoText: "akakçe",
                },
                {
                    name: "Cimri",
                    tag: "Fiyat Karşılaştır",
                    url: `https://www.cimri.com/arama?q=${encoded}`,
                    brandColor: "#20692B",
                    textColor: "#FFFFFF",
                    logoText: "cimri",
                },
            ],
        },
    ];

    return (
        <section
            className="block detail-buy-block"
            id="satin-al"
            aria-labelledby="buy-main-heading"
        >
            <div className="detail-buy-main-header">
                <div>
                    <h2 id="buy-main-heading" className="block-title">
                        {perfumeName} Fiyatları, Satış Noktaları ve En Ucuz Nereden Alınır?
                    </h2>
                    <p className="detail-buy-lead">
                        Yetkili butikler, popüler pazaryerleri, açık parfüm muadilleri ve fiyat karşılaştırma portalları üzerinde anlık arama yapın.
                    </p>
                </div>
            </div>

            <div className="buy-stacked-sliders">
                {groups.map((group) => (
                    <StoreSliderRow
                        key={group.id}
                        group={group}
                        perfumeName={perfumeName}
                    />
                ))}
            </div>
        </section>
    );
}
