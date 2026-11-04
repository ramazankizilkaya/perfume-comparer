import { brandHref, searchHref } from "./urls";

/**
 * Detaylı arama sayfasının adres parametreleri. Hem sunucu (ilk sayfa + metadata)
 * hem tarayıcı (etkileşimli filtre) aynı tanımı kullanır; böylece sunucunun bastığı
 * ilk sonuç listesi ile istemcinin kuracağı istek birebir aynı olur.
 */

export const SEARCH_PAGE_SIZE = 48;

/** Virgülle çoklu değer alan filtreler. */
export const LIST_KEYS = ["gender", "family", "concentration", "brand", "accord", "note", "season", "ageGroup"] as const;
export type ListKey = (typeof LIST_KEYS)[number];

/** Tek başına kullanıldığında kendi canonical'ı ile indekslenen filtreler. */
export const INDEXABLE_FACETS = ["accord", "note", "gender", "family", "brand"] as const;
type IndexableFacet = (typeof INDEXABLE_FACETS)[number];

export interface SearchQuery {
    q: string;
    gender: string[];
    family: string[];
    concentration: string[];
    brand: string[];
    accord: string[];
    note: string[];
    noteLayer: string;
    season: string[];
    ageGroup: string[];
    sort: string;
    userFilter: string;
    ai: boolean;
}

interface NamedRef {
    name: string;
    slug: string;
}

export interface SearchMeta {
    brands: NamedRef[];
    concentrations: NamedRef[];
    fragranceFamilies: NamedRef[];
    accords: NamedRef[];
    notes: { name: string; slug: string; category?: string | null }[];
    seasons: NamedRef[];
    ageGroups: NamedRef[];
}

export const GENDERS = [
    { label: "Erkek", slug: "erkek" },
    { label: "Kadın", slug: "kadin" },
    { label: "Unisex", slug: "unisex" },
];

export const SORTS = [
    { v: "", label: "Varsayılan" },
    { v: "random", label: "Keşfet" },
    { v: "rating", label: "Puanı En Yüksek" },
    { v: "votes", label: "En Çok Değerlendirilen" },
    { v: "trending", label: "Bu Hafta Popüler" },
    { v: "views", label: "Popüler" },
    { v: "comments", label: "En Çok Yorum Alan" },
    { v: "newest", label: "En Yeni Gelenler" },
    { v: "oldest", label: "En Eski" },
    { v: "name", label: "İsim (A-Z)" },
];

type RawParams = { [key: string]: string | string[] | undefined } | URLSearchParams;

function readParam(sp: RawParams, key: string): string | null {
    if (sp instanceof URLSearchParams) return sp.get(key);
    const v = sp[key];
    return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export function normalizeGender(g: string): string {
    return g === "male" ? "erkek" : g === "female" ? "kadin" : g;
}

function readList(sp: RawParams, key: ListKey): string[] {
    const raw = readParam(sp, key);
    if (!raw) return [];
    const list = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
    return key === "gender" ? list.map(normalizeGender) : list;
}

/** Adres parametrelerini (sunucuda searchParams, tarayıcıda URLSearchParams) tek yapıya çevirir. */
export function parseSearchQuery(sp: RawParams): SearchQuery {
    return {
        q: (readParam(sp, "q") ?? "").trim(),
        gender: readList(sp, "gender"),
        family: readList(sp, "family"),
        concentration: readList(sp, "concentration"),
        brand: readList(sp, "brand"),
        accord: readList(sp, "accord"),
        note: readList(sp, "note"),
        noteLayer: readParam(sp, "noteLayer") ?? "",
        season: readList(sp, "season"),
        ageGroup: readList(sp, "ageGroup"),
        sort: readParam(sp, "sort") ?? "",
        userFilter: readParam(sp, "userFilter") ?? "",
        ai: readParam(sp, "ai") === "1",
    };
}

/** Adres çubuğuna yazılacak parametreler (page/pageSize hariç). */
export function toUrlParams(query: SearchQuery): URLSearchParams {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    for (const key of LIST_KEYS) {
        if (query[key].length) p.set(key, query[key].join(","));
    }
    if (query.note.length && query.noteLayer) p.set("noteLayer", query.noteLayer);
    if (query.sort) p.set("sort", query.sort);
    if (query.userFilter) p.set("userFilter", query.userFilter);
    if (query.ai) p.set("ai", "1");
    return p;
}

/** API'ye gidecek sorgu dizesi (kullanıcıya özel favSlugs tarayıcıda ayrıca eklenir). */
export function buildApiQuery(query: SearchQuery, page: number, favSlugs?: string[]): URLSearchParams {
    const p = toUrlParams(query);
    if (query.userFilter === "favorites" && favSlugs && favSlugs.length > 0) {
        p.set("favSlugs", favSlugs.join(","));
    }
    p.set("page", String(page));
    p.set("pageSize", String(SEARCH_PAGE_SIZE));
    return p;
}

/**
 * Sunucu bu sorgunun ilk sayfasını getirebilir mi? Kullanıcıya özel listeler (favoriler,
 * yorumlarım) oturum ister; yapay zekâ araması pahalıdır ve tarayıcıda tetiklenir.
 */
export function isServerFetchable(query: SearchQuery): boolean {
    return !query.userFilter && !query.ai;
}

/** Tüm parametreleri sayar (hangi filtre türünden olursa olsun). */
export function countActiveParams(query: SearchQuery): number {
    return (
        LIST_KEYS.reduce((n, k) => n + query[k].length, 0) +
        (query.q ? 1 : 0) +
        (query.sort ? 1 : 0) +
        (query.userFilter ? 1 : 0) +
        (query.ai ? 1 : 0)
    );
}

/** Yalnızca tek bir indekslenebilir filtre, tek değerle seçiliyse onu döner. */
export function singleFacet(query: SearchQuery): { key: IndexableFacet; slug: string } | null {
    if (countActiveParams(query) !== 1) return null;
    for (const key of INDEXABLE_FACETS) {
        if (query[key].length === 1) return { key, slug: query[key][0] };
    }
    return null;
}

function humanize(slug: string): string {
    return slug
        .split("-")
        .filter(Boolean)
        .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1))
        .join(" ");
}

export function facetName(meta: SearchMeta | null, key: IndexableFacet, slug: string): string {
    if (key === "gender") return GENDERS.find((g) => g.slug === slug)?.label ?? humanize(slug);
    const list: NamedRef[] =
        key === "brand"
            ? meta?.brands ?? []
            : key === "accord"
              ? meta?.accords ?? []
              : key === "note"
                ? meta?.notes ?? []
                : meta?.fragranceFamilies ?? [];
    return list.find((x) => x.slug === slug)?.name ?? humanize(slug);
}

export interface SearchDescription {
    /** Sayfanın H1'i (küçük harf Türkçe doğal yazım). */
    h1: string;
    /** Başlık etiketi (site adı şablondan eklenir). */
    title: string;
    description: string;
    /** Giriş cümlesi; toplam biliniyorsa sayı içerir. */
    intro: string;
    /** false ise robots noindex,follow verilir. */
    indexable: boolean;
    /** rel=canonical için yol. */
    canonicalPath: string;
    /** Kırıntı yolunda son adım (tek filtre varsa). */
    crumb?: string;
}

const BASE_TITLE = "Detaylı Parfüm Arama - Nota, Marka ve Koku Ailesine Göre Filtrele";
const BASE_DESCRIPTION =
    "Binlerce parfümü notalarına, akorlarına, markasına, koku ailesine, mevsimine ve cinsiyetine göre filtreleyin ve sıralayın.";

/**
 * Aktif filtreye göre H1, başlık, açıklama ve indeksleme kuralını üretir.
 * - Filtresiz sayfa: indekslenir, canonical kendisi.
 * - Tek filtre (akor, nota, cinsiyet, koku ailesi): indekslenir, canonical kendisi.
 * - Tek marka filtresi: markanın asıl sayfası /tr/marka/<slug> olduğundan canonical oraya gider.
 * - Serbest metin, sıralama, sayfalama, kullanıcı listeleri ve çoklu kombinasyonlar:
 *   noindex,follow; canonical filtresiz arama sayfası.
 */
export function describeSearch(query: SearchQuery, meta: SearchMeta | null, total?: number | null): SearchDescription {
    const intro =
        typeof total === "number"
            ? `${total.toLocaleString("tr-TR")} parfüm listelendi. Notalar, akorlar, marka ve kullanım tercihleriyle listeyi daraltın.`
            : "Binlerce parfümü notalarına, akorlarına ve markasına göre filtreleyin; sonuçlar anında güncellenir.";

    const active = countActiveParams(query);
    if (active === 0) {
        return {
            h1: "Detaylı parfüm arama",
            title: BASE_TITLE,
            description: BASE_DESCRIPTION,
            intro,
            indexable: true,
            canonicalPath: searchHref(),
        };
    }

    const facet = singleFacet(query);
    if (facet) {
        const name = facetName(meta, facet.key, facet.slug);
        const self = searchHref({ [facet.key]: facet.slug });
        switch (facet.key) {
            case "note":
                return {
                    h1: `${name} notalı parfümler`,
                    title: `${name} Notalı Parfümler - İçinde ${name} Notası Olan Kokular`,
                    description: `İçinde ${name} notası bulunan parfümlerin listesi: koku piramidi, ana akorlar, kalıcılık ve kullanıcı puanlarıyla karşılaştırın.`,
                    intro,
                    indexable: true,
                    canonicalPath: self,
                    crumb: `${name} notası`,
                };
            case "accord":
                return {
                    h1: `${name} akorlu parfümler`,
                    title: `${name} Akorlu Parfümler - ${name} Ağırlıklı Kokular`,
                    description: `${name} akoru baskın parfümlerin listesi: notaları, kalıcılık ve yayılım puanları, kullanıcı yorumlarıyla karşılaştırın.`,
                    intro,
                    indexable: true,
                    canonicalPath: self,
                    crumb: `${name} akoru`,
                };
            case "gender": {
                const h1 = facet.slug === "unisex" ? "Unisex parfümler" : `${name} parfümleri`;
                return {
                    h1,
                    title: `${h1.charAt(0).toLocaleUpperCase("tr")}${h1.slice(1)} - En Beğenilen ${name} Kokuları`,
                    description: `${h1}: koku piramidi, akorlar, kalıcılık ve kullanıcı puanlarıyla binlerce ${name.toLocaleLowerCase("tr")} kokusunu filtreleyin ve karşılaştırın.`,
                    intro,
                    indexable: true,
                    canonicalPath: self,
                    crumb: name,
                };
            }
            case "family":
                return {
                    h1: `${name} parfümler`,
                    title: `${name} Parfümler - ${name} Koku Ailesi`,
                    description: `${name} koku ailesine ait parfümlerin listesi: notaları, akorları, kalıcılık ve kullanıcı puanlarıyla karşılaştırın.`,
                    intro,
                    indexable: true,
                    canonicalPath: self,
                    crumb: `${name} koku ailesi`,
                };
            case "brand":
                return {
                    h1: `${name} parfümleri`,
                    title: `${name} Parfümleri - Tüm ${name} Kokuları`,
                    description: `${name} markasının tüm parfümleri: notaları, akorları, kalıcılık ve kullanıcı puanlarıyla filtreleyin ve karşılaştırın.`,
                    intro,
                    indexable: true,
                    // Markanın asıl sayfası /tr/marka/<slug>; arama görünümü onun kopyası sayılmasın.
                    canonicalPath: brandHref(facet.slug),
                    crumb: name,
                };
        }
    }

    if (query.q && active === 1) {
        return {
            h1: `“${query.q}” için arama sonuçları`,
            title: `${query.q} Parfüm Arama Sonuçları`,
            description: `“${query.q}” aramasına uyan parfümler: notaları, akorları ve kullanıcı puanlarıyla karşılaştırın.`,
            intro,
            indexable: false,
            canonicalPath: searchHref(),
        };
    }

    return {
        h1: "Detaylı parfüm arama",
        title: BASE_TITLE,
        description: BASE_DESCRIPTION,
        intro,
        indexable: false,
        canonicalPath: searchHref(),
    };
}
