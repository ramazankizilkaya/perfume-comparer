import React from "react";

interface StoreItem {
    name: string;
    url: string;
    logoUrl: string;
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
            </div>

            <div className="buy-slider-track-wrap">
                <div className="buy-slider-track">
                    {group.stores.map((store, idx) => (
                        <a
                            key={idx}
                            href={store.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="buy-store-card"
                            title={`${perfumeName} - ${store.name} Satış Noktası ve Güncel Fiyatları`}
                            aria-label={`${perfumeName} ${store.name} Satış Noktası ve Fiyatları`}
                        >
                            <div className="buy-card-logo-wrap">
                                <img
                                    src={store.logoUrl}
                                    alt={`${store.name} - ${perfumeName} satış noktası ve güncel fiyatları`}
                                    className="buy-card-logo-img"
                                    loading="lazy"
                                />
                            </div>
                            <span className="sr-only">
                                {perfumeName} {store.name} Satış Noktası ve En Ucuz Fiyatları
                            </span>
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
                    url: `https://www.beymen.com/search?q=${encoded}`,
                    logoUrl: "/stores/beymen.jpeg",
                },
                {
                    name: "Sephora",
                    url: `https://www.sephora.com.tr/ara/?q=${encoded}`,
                    logoUrl: "/stores/sephora.png",
                },
                {
                    name: "Boyner",
                    url: `https://www.boyner.com.tr/arama?q=${encoded}`,
                    logoUrl: "/stores/boyner.webp",
                },
                {
                    name: "Sevil Parfümeri",
                    url: `https://www.sevil.com.tr/catalogsearch/result/?q=${encoded}`,
                    logoUrl: "/stores/sevil.jpeg",
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
                    url: `https://www.trendyol.com/sr?q=${encoded}`,
                    logoUrl: "/stores/trendyol.png",
                },
                {
                    name: "Hepsiburada",
                    url: `https://www.hepsiburada.com/ara?q=${encoded}`,
                    logoUrl: "/stores/hepsiburada.jpg",
                },
                {
                    name: "N11",
                    url: `https://www.n11.com/arama?q=${encoded}`,
                    logoUrl: "/stores/n11.png",
                },
                {
                    name: "Çiçeksepeti",
                    url: `https://www.ciceksepeti.com/arama?query=${encoded}`,
                    logoUrl: "/stores/ciceksepeti.jpeg",
                },
                {
                    name: "PttAVM",
                    url: `https://www.pttavm.com/arama/${encoded}`,
                    logoUrl: "/stores/pttavm.jpg",
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
                    name: "Bargello",
                    url: "https://www.bargello.com.tr/",
                    logoUrl: "/stores/bargello.svg",
                },
                {
                    name: "D&P Perfumum",
                    url: "https://dpperfumum.com.tr/",
                    logoUrl: "/stores/dpparfum.webp",
                },
                {
                    name: "David Walker",
                    url: "https://www.e-davidwalker.com/",
                    logoUrl: "/stores/davidwalker.webp",
                },
                {
                    name: "Emre Geldi",
                    url: "https://www.emregeldiparfums.com/",
                    logoUrl: "/stores/emregeldi.webp",
                },
                {
                    name: "Loris",
                    url: "https://www.lorisparfum.com/",
                    logoUrl: "/stores/loris.webp",
                },
                {
                    name: "Mad Parfüm",
                    url: "https://www.madparfum.com/",
                    logoUrl: "/stores/mad.svg",
                },
                {
                    name: "Muscent",
                    url: "https://muscent.com/",
                    logoUrl: "/stores/muscent.webp",
                },
                {
                    name: "Tutaste",
                    url: "https://www.ozelparfum.com/",
                    logoUrl: "/stores/tutaste.webp",
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
                    url: `https://www.akakce.com/arama/?q=${encoded}`,
                    logoUrl: "/stores/akakce.png",
                },
                {
                    name: "Cimri",
                    url: `https://www.cimri.com/arama?q=${encoded}`,
                    logoUrl: "/stores/cimri.png",
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
