/**
 * Koku notası ikonları. Nota adına, yoksa kategorisine göre bir glif döner.
 * Emoji kullanıyoruz: her ortamda (indirme/lisans/ağ derdi olmadan) renkli ve
 * okunur görünür. Aynı eşleme ileride indirilmiş SVG'lerle değiştirilebilir.
 */

const NAME_ICONS: Record<string, string> = {
    bergamot: "🍊",
    limon: "🍋",
    lavanta: "💜",
    ambroxan: "🔶",
    vanilya: "🍦",
    oud: "🪵",
    sedir: "🌲",
    vetiver: "🌾",
    paçuli: "🍃",
    "kara biber": "🌶️",
    tarçın: "🟤",
    gül: "🌹",
    yasemin: "🌼",
    misk: "🤍",
    deri: "🟫",
    tütün: "🍂",
};

const CATEGORY_ICONS: Record<string, string> = {
    narenciye: "🍋",
    aromatik: "🌿",
    amber: "🔶",
    tatlı: "🍯",
    odunsu: "🪵",
    baharatlı: "🌶️",
    çiçeksi: "🌸",
    hayvansal: "🐾",
    deri: "🟫",
    tütün: "🍂",
    meyveli: "🍑",
    yeşil: "🌿",
    akuatik: "💧",
};

export function noteIcon(name?: string | null, category?: string | null): string {
    const n = (name ?? "").trim().toLocaleLowerCase("tr");
    if (NAME_ICONS[n]) return NAME_ICONS[n];
    const c = (category ?? "").trim().toLocaleLowerCase("tr");
    if (CATEGORY_ICONS[c]) return CATEGORY_ICONS[c];
    return "🌱";
}
