/**
 * Koku notası ikonları.
 * Nota adına, anahtar kelime eşleşmelerine veya kategorisine göre uygun glif döner.
 */

const EXACT_NOTE_ICONS: Record<string, string> = {
    // Narenciye & Meyveler
    bergamot: "🍊",
    limon: "🍋",
    lime: "🍋",
    mandalina: "🍊",
    mandarin: "🍊",
    portakal: "🍊",
    greyfurt: "🍊",
    narenciye: "🍋",
    "kan portakalı": "🍊",
    "acı portakal": "🍊",
    ananas: "🍍",
    elma: "🍏",
    "yeşil elma": "🍏",
    "kırmızı elma": "🍎",
    armut: "🍐",
    şeftali: "🍑",
    kayısı: "🍑",
    kiraz: "🍒",
    çilek: "🍓",
    ahududu: "🫐",
    böğürtlen: "🫐",
    "siyah frenk üzümü": "🍇",
    "frenk üzümü": "🍇",
    erik: "🫐",
    incir: "🫐",
    nar: "🍎",
    mango: "🥭",
    karpuz: "🍉",
    kavun: "🍈",
    "hindistan cevizi": "🥥",
    litchi: "🍒",
    çarkıfelek: "🥭",
    yuzu: "🍋",
    nektarin: "🍑",

    // Çiçekler
    gül: "🌹",
    "bulgar gülü": "🌹",
    "türk gülü": "🌹",
    "şam gülü": "🌹",
    "mayıs gülü": "🌹",
    yasemin: "🌼",
    "sambac yasemini": "🌼",
    lavanta: "🪻",
    menekşe: "🪻",
    "menekşe yaprağı": "🍃",
    "menekşe yaprakları": "🍃",
    iris: "🪻",
    "orris kökü": "🪻",
    sümbül: "🪻",
    sümbülteber: "🪷",
    lotus: "🪷",
    nilüfer: "🪷",
    zambak: "💮",
    neroli: "💮",
    "portakal çiçeği": "💮",
    "afrika portakal çiçeği": "💮",
    gardenya: "💮",
    orkide: "🌺",
    manolya: "🌸",
    şakayık: "🌸",
    frezya: "🌸",
    müge: "🌸",
    sıklamen: "🌸",
    "kadife çiçeği": "🌼",
    nergis: "🌼",
    papatya: "🌼",
    sardunya: "🌺",
    "ylang-ylang": "🌼",
    osmanthus: "🌼",
    mimoza: "🌼",
    leylak: "🪻",
    hanımeli: "🌸",
    tiare: "💮",
    "tiare çiçeği": "💮",
    frangipani: "💮",
    hibisküs: "🌺",
    heliotrope: "🪻",
    "ölmez çiçek": "🌼",

    // Odunsular & Orman
    sedir: "🌲",
    "sedir ağacı": "🌲",
    çam: "🌲",
    ladin: "🌲",
    selvi: "🌲",
    "sandal ağacı": "🪵",
    sandal: "🪵",
    oud: "🪵",
    "agar ağacı (oud)": "🪵",
    "agar ağacı": "🪵",
    "guayak ağacı": "🪵",
    huş: "🪵",
    "meşe yosunu": "🪵",
    meşe: "🪵",
    "kaşmir ağacı": "🪵",
    kaşmeran: "🪵",
    akigalawood: "🪵",
    vetiver: "🌾",
    paçuli: "🍃",
    yosun: "🌿",
    papirüs: "📜",
    "brezilya gül ağacı": "🪵",

    // Baharatlar
    tarçın: "🥢",
    karanfil: "🟤",
    kakule: "🫚",
    zencefil: "🫚",
    karabiber: "🌶️",
    "pembe biber": "🌶️",
    biber: "🌶️",
    safran: "🏵️",
    muskat: "🌰",
    kimyon: "🧂",
    kişniş: "🌿",
    anason: "✳️",
    "yıldız anasonu": "✳️",
    vanilya: "🍦",
    "bourbon vanilya": "🍦",
    "madagaskar vanilyası": "🍦",

    // Reçineler, Tütsü & Amber
    amber: "🔶",
    "beyaz amber": "🔶",
    "amber ağacı": "🔶",
    ambergris: "🔶",
    ambroksan: "🔶",
    ambroxan: "🔶",
    benzoin: "🔶",
    labdanum: "🔶",
    tütsü: "💨",
    olibanum: "💨",
    mür: "💨",
    günlük: "💨",
    elemi: "🔶",
    styrax: "🔶",
    opoponaks: "🔶",
    reçineler: "🔶",
    "peru balsamı": "🔶",

    // Yeşillik, Otlar & Çay
    nane: "🌿",
    galbanum: "🌿",
    fesleğen: "🌿",
    biberiye: "🌿",
    adaçayı: "🌿",
    "misk adaçayı": "🌿",
    kekik: "🌿",
    çay: "🍵",
    mate: "🍵",
    tütün: "🍂",
    "pelin otu": "🌿",
    "melek otu": "🌿",
    tarhun: "🌿",
    petitgrain: "🍃",

    // Gurme & Tatlı
    bal: "🍯",
    karamel: "🍮",
    çikolata: "🍫",
    "bitter çikolata": "🍫",
    "kakao kabuğu": "🍫",
    kahve: "☕",
    badem: "🥜",
    fındık: "🌰",
    "antep fıstığı": "🥜",
    "tonka fasulyesi": "🫘",
    tonka: "🫘",
    kumarin: "🫘",
    pralin: "🍬",
    şeker: "🍬",
    marşmelov: "🍬",
    "krem şanti": "🥛",
    süt: "🥛",

    // İçkiler
    rom: "🥃",
    viski: "🥃",
    konyak: "🥃",
    şampanya: "🥂",

    // Mineraller, Akuatik & Moleküller
    aldehitler: "🫧",
    "deniz notaları": "🌊",
    "su notaları": "💧",
    "sulu notalar": "💧",
    tuz: "🧂",
    "güneş notaları": "☀️",
    misk: "🤍",
    "beyaz misk": "🤍",
    deri: "🟫",
    süet: "🟫",
    sivet: "🐾",
};

const KEYWORD_RULES: [RegExp, string][] = [
    [/gül|rose/i, "🌹"],
    [/yasemin|jasmine/i, "🌼"],
    [/menekşe|violet|iris|sümbül|lavanta/i, "🪻"],
    [/çiçek|flower|floral|şakayık|frezya|orkide|manolya|müge/i, "🌸"],
    [/narenciye|citrus|limon|lemon|mandalin|bergamot|greyfurt|orange|portakal/i, "🍊"],
    [/meyve|fruit|elma|armut|çilek|kiraz|şeftali|berry|üzüm/i, "🍎"],
    [/ağaç|ağacı|wood|odun|sedir|sandal|oud|çam|selvi|huş|meşe/i, "🪵"],
    [/baharat|spice|biber|pepper|tarçın|kakule|zencefil|karanfil|safran/i, "🌶️"],
    [/amber|kehribar|ambrox/i, "🔶"],
    [/reçine|resin|balsam|tütsü|incense|benzoin|labdanum/i, "💨"],
    [/ot|yaprak|nane|mint|yeşil|green|fesleğen|adaçayı|kekik/i, "🌿"],
    [/çay|tea/i, "🍵"],
    [/deniz|sea|su|water|akuatik|marine|ocean/i, "🌊"],
    [/tatlı|sweet|şeker|sugar|bal|honey|karamel|vanil|tonka|çikolata/i, "🍯"],
    [/kahve|coffee/i, "☕"],
    [/alkol|rom|viski|liqueur/i, "🥃"],
    [/deri|leather|süet/i, "🟫"],
    [/misk|musk/i, "🤍"],
];

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
    const raw = (name ?? "").trim().toLocaleLowerCase("tr");
    if (!raw) return "🌱";

    // 1. Doğrudan tam isim eşleşmesi
    if (EXACT_NOTE_ICONS[raw]) return EXACT_NOTE_ICONS[raw];

    // 2. Parantez içi temizlenmiş isim (örn: "Agar ağacı (Oud)" -> "agar ağacı")
    const cleaned = raw.replace(/\(.*?\)/g, "").trim();
    if (EXACT_NOTE_ICONS[cleaned]) return EXACT_NOTE_ICONS[cleaned];

    // 3. Akıllı anahtar kelime eşleşmesi
    for (const [pattern, icon] of KEYWORD_RULES) {
        if (pattern.test(raw)) return icon;
    }

    // 4. Kategori bazlı eşleşme
    const c = (category ?? "").trim().toLocaleLowerCase("tr");
    if (CATEGORY_ICONS[c]) return CATEGORY_ICONS[c];

    return "🌱";
}
