import type { Metadata } from "next";
import HomeFeedClient, { type HomeFeedData } from "@/components/HomeFeedClient";
import { API_BASE } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Aura Compare - Parfüm Karşılaştırma, Koku Notaları ve Fiyat İnceleme",
    description: "Binlerce parfümün koku piramidi, kalıcılık ve yayılım puanları, kullanıcı yorumları ve detaylı karşılaştırmaları.",
};

export default async function Home() {
    let initialData: HomeFeedData = {
        blogs: [],
        explorePerfumes: [],
        popularPerfumes: [],
        comparisons: [],
        randomBrands: [],
        newestPerfumes: [],
        mostCommentedPerfumes: [],
        mostRatedPerfumes: [],
        topRatedPerfumes: [],
    };

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
            fetch(`${API_BASE}/api/blogs`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/perfumes?sort=random&pageSize=20`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/perfumes?sort=views&randomPool=500&pageSize=20`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/compare/popular`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/brands/random?count=20`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/perfumes?sort=newest&randomPool=500&pageSize=20`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/perfumes?sort=comments&randomPool=500&pageSize=20`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/perfumes?sort=votes&randomPool=500&pageSize=20`, { cache: "no-store" }),
            fetch(`${API_BASE}/api/perfumes?sort=rating&minVotes=500&randomPool=500&pageSize=20`, { cache: "no-store" }),
        ]);

        initialData = {
            blogs: blogsRes.ok ? await blogsRes.json() : [],
            explorePerfumes: exploreRes.ok ? (await exploreRes.json()).items ?? [] : [],
            popularPerfumes: popRes.ok ? (await popRes.json()).items ?? [] : [],
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

    return <HomeFeedClient initialData={initialData} />;
}
