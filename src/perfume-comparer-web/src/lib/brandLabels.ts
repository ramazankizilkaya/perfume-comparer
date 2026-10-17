/**
 * Marka verisi kaynaktan İngilizce geliyor (ülke, faaliyet alanı). Sayfa ve meta
 * açıklaması Türkçe olduğu için burada çevrilir; tabloda olmayan değer olduğu gibi kalır.
 */
const COUNTRY_TR: Record<string, string> = {
    France: "Fransa",
    "United Arab Emirates": "Birleşik Arap Emirlikleri",
    Italy: "İtalya",
    "United States": "Amerika Birleşik Devletleri",
    USA: "Amerika Birleşik Devletleri",
    "United Kingdom": "Birleşik Krallık",
    England: "İngiltere",
    Scotland: "İskoçya",
    Spain: "İspanya",
    Germany: "Almanya",
    Switzerland: "İsviçre",
    Netherlands: "Hollanda",
    Monaco: "Monako",
    Brazil: "Brezilya",
    "Saudi Arabia": "Suudi Arabistan",
    Oman: "Umman",
    Sweden: "İsveç",
    Argentina: "Arjantin",
    Japan: "Japonya",
    Turkey: "Türkiye",
    Türkiye: "Türkiye",
    Egypt: "Mısır",
    Canada: "Kanada",
    Portugal: "Portekiz",
    Belgium: "Belçika",
    Russia: "Rusya",
    India: "Hindistan",
    Australia: "Avustralya",
    Greece: "Yunanistan",
    Poland: "Polonya",
    Denmark: "Danimarka",
    Austria: "Avusturya",
    Lebanon: "Lübnan",
    Kuwait: "Kuveyt",
    Qatar: "Katar",
    Bahrain: "Bahreyn",
    Morocco: "Fas",
    Mexico: "Meksika",
    China: "Çin",
    "South Korea": "Güney Kore",
    Ireland: "İrlanda",
    Norway: "Norveç",
    Finland: "Finlandiya",
    "Czech Republic": "Çekya",
    Hungary: "Macaristan",
    Israel: "İsrail",
    Iran: "İran",
    Indonesia: "Endonezya",
    Malaysia: "Malezya",
    Singapore: "Singapur",
    Thailand: "Tayland",
    "South Africa": "Güney Afrika",
    Chile: "Şili",
    Colombia: "Kolombiya",
    "New Zealand": "Yeni Zelanda",
    Luxembourg: "Lüksemburg",
    Tunisia: "Tunus",
    Algeria: "Cezayir",
    Jordan: "Ürdün",
    Ukraine: "Ukrayna",
    Romania: "Romanya",
    Bulgaria: "Bulgaristan",
    Croatia: "Hırvatistan",
    Lithuania: "Litvanya",
    Cyprus: "Kıbrıs",
    Georgia: "Gürcistan",
    Azerbaijan: "Azerbaycan",
};

const ACTIVITY_TR: Record<string, string> = {
    Fashion: "Moda",
    Perfumery: "Parfümeri",
    "Niche perfumery": "Niş parfümeri",
    Cosmetics: "Kozmetik",
    Beauty: "Güzellik",
    Fragrance: "Koku",
    Jewelry: "Mücevher",
    Jewellery: "Mücevher",
    "Luxury goods": "Lüks ürünler",
    Luxury: "Lüks ürünler",
    Retail: "Perakende",
    "Department store": "Mağaza zinciri",
    Design: "Tasarım",
    "Haute couture": "Yüksek moda",
    "Leather goods": "Deri ürünleri",
    Watches: "Saat",
    Lifestyle: "Yaşam tarzı",
    Textile: "Tekstil",
    Apparel: "Giyim",
    Clothing: "Giyim",
    Footwear: "Ayakkabı",
    Accessories: "Aksesuar",
    Pharmacy: "Eczacılık",
    Skincare: "Cilt bakımı",
    "Hair care": "Saç bakımı",
    Automotive: "Otomotiv",
    Sports: "Spor",
    Celebrity: "Ünlü markası",
    "Home fragrance": "Ev kokusu",
    Candles: "Mum",
};

export function countryLabel(country?: string | null): string | null {
    if (!country) return null;
    const key = country.trim();
    return COUNTRY_TR[key] ?? key;
}

export function activityLabel(activity?: string | null): string | null {
    if (!activity) return null;
    const key = activity.trim();
    return ACTIVITY_TR[key] ?? ACTIVITY_TR[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] ?? key;
}

/**
 * Marka açıklaması kaynaktan "… veri tabanımızda 316 parfümü bulunmaktadır" gibi eski bir
 * sayıyla geliyor; tablo ise güncel sayıyı gösteriyor. Metindeki sayı güncel değerle değiştirilir.
 */
export function syncPerfumeCountInText(text: string | null | undefined, perfumeCount: number): string | null {
    if (!text) return null;
    if (!perfumeCount) return text;
    return text.replace(/\b\d{1,5}\s+parfümü bulunmaktadır/u, `${perfumeCount} parfümü bulunmaktadır`);
}
