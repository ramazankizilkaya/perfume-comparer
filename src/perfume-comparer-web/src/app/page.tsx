import type { Metadata } from "next";
import { cookies } from "next/headers";
import HomeFeedClient, { type HomeFeedData } from "@/components/HomeFeedClient";
import { localeHref } from "@/lib/urls";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import { apiFetch } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
    title: `${SITE_NAME} - Parfüm Karşılaştırma, Koku Notaları ve Fiyat İnceleme`,
    description: "Binlerce parfümün koku piramidi, kalıcılık ve yayılım puanları, kullanıcı yorumları ve detaylı karşılaştırmaları.",
    path: localeHref("/"),
    absoluteTitle: true,
});

export default async function Home() {
    let initialData: HomeFeedData = {
        blogs: [],
        explorePerfumes: [],
        popularPerfumes: [],
        mostViewedPerfumes: [],
        comparisons: [],
        randomBrands: [],
        newestPerfumes: [],
        mostCommentedPerfumes: [],
        mostRatedPerfumes: [],
        topRatedPerfumes: [],
    };

    let normGender: string | null = null;
    try {
        const cookieStore = await cookies();
        const genderCookie = cookieStore.get("gender-pref")?.value;
        if (genderCookie) {
            try {
                const parsed = JSON.parse(decodeURIComponent(genderCookie));
                normGender = parsed === "male" ? "erkek" : parsed === "female" ? "kadin" : parsed;
            } catch {
                normGender = genderCookie === "male" ? "erkek" : genderCookie === "female" ? "kadin" : genderCookie;
            }
        }
    } catch {
        /* cookie hatasında varsayılana dön */
    }

    const g = normGender && normGender !== "all" ? `&gender=${normGender}` : "";

    try {
        // Anasayfa verisi 60 saniye önbellekte kalır: her ziyarette 10 ayrı API çağrısı
        // yerine dakikada bir yenilenir. Rastgele bölümler dakikada bir değişir, bu yeterli.
        // randomPool=100: API sıralı listeleri 100 ile sınırlar; daha büyük havuz istemek
        // anlamsızdır (bkz. CatalogService Take(100)).
        const cacheOpt = { next: { revalidate: 60 } } as const;
        const [
            blogsRes,
            exploreRes,
            popRes,
            viewedRes,
            compRes,
            brandsRes,
            newRes,
            commRes,
            votesRes,
            topRes,
        ] = await Promise.all([
            apiFetch(`/api/blogs?random=true&take=5`, cacheOpt),
            apiFetch(`/api/perfumes?sort=random&pageSize=20${g}`, cacheOpt),
            apiFetch(`/api/perfumes?sort=trending&randomPool=100&pageSize=20${g}`, cacheOpt),
            apiFetch(`/api/perfumes?sort=views&pageSize=20${g}`, cacheOpt),
            apiFetch(`/api/compare/popular`, cacheOpt),
            apiFetch(`/api/brands/random?count=20`, cacheOpt),
            apiFetch(`/api/perfumes?sort=newest&randomPool=100&pageSize=20${g}`, cacheOpt),
            apiFetch(`/api/perfumes?sort=comments&randomPool=100&pageSize=20${g}`, cacheOpt),
            apiFetch(`/api/perfumes?sort=votes&randomPool=100&pageSize=20${g}`, cacheOpt),
            apiFetch(`/api/perfumes?sort=rating&minVotes=500&randomPool=100&pageSize=20${g}`, cacheOpt),
        ]);

        initialData = {
            blogs: blogsRes.ok ? (await blogsRes.json()).slice(0, 5) : [],
            explorePerfumes: exploreRes.ok ? (await exploreRes.json()).items ?? [] : [],
            popularPerfumes: popRes.ok ? (await popRes.json()).items ?? [] : [],
            mostViewedPerfumes: viewedRes.ok ? (await viewedRes.json()).items ?? [] : [],
            comparisons: compRes.ok ? await compRes.json() : [],
            randomBrands: brandsRes.ok ? await brandsRes.json() : [],
            newestPerfumes: newRes.ok ? (await newRes.json()).items ?? [] : [],
            mostCommentedPerfumes: commRes.ok ? (await commRes.json()).items ?? [] : [],
            mostRatedPerfumes: votesRes.ok ? (await votesRes.json()).items ?? [] : [],
            topRatedPerfumes: topRes.ok ? (await topRes.json()).items ?? [] : [],
        };
    } catch {
        /* backend hatasında boş veri */
    }

    return <HomeFeedClient initialData={initialData} initialGender={normGender} />;
}
