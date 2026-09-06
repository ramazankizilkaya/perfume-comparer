import type { Metadata } from "next";
import HomeFeedClient, { type HomeFeedData } from "@/components/HomeFeedClient";
import { API_BASE } from "@/lib/urls";

export const metadata: Metadata = {
    title: "Aura Compare - Parfüm Karşılaştırma, Koku Notaları ve Fiyat İnceleme",
    description: "Binlerce parfümün koku piramidi, kalıcılık ve yayılım puanları, kullanıcı yorumları ve detaylı karşılaştırmaları.",
};

export default async function Home() {
    let initialData: HomeFeedData = {
        blogs: [],
        popularPerfumes: [],
        comparisons: [],
        newestPerfumes: [],
        mostCommentedPerfumes: [],
        mostRatedPerfumes: [],
        topRatedPerfumes: [],
    };

    try {
        const [
            blogsRes,
            popRes,
            compRes,
            newRes,
            commRes,
            votesRes,
            topRes,
        ] = await Promise.all([
            fetch(`${API_BASE}/api/blogs`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes?sort=views&pageSize=12`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/compare/popular`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes?sort=newest&pageSize=12`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes?sort=comments&pageSize=12`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes?sort=votes&pageSize=12`, { next: { revalidate: 60 } }),
            fetch(`${API_BASE}/api/perfumes?sort=rating&minVotes=500&pageSize=12`, { next: { revalidate: 60 } }),
        ]);

        initialData = {
            blogs: blogsRes.ok ? await blogsRes.json() : [],
            popularPerfumes: popRes.ok ? (await popRes.json()).items ?? [] : [],
            comparisons: compRes.ok ? await compRes.json() : [],
            newestPerfumes: newRes.ok ? (await newRes.json()).items ?? [] : [],
            mostCommentedPerfumes: commRes.ok ? (await commRes.json()).items ?? [] : [],
            mostRatedPerfumes: votesRes.ok ? (await votesRes.json()).items ?? [] : [],
            topRatedPerfumes: topRes.ok ? (await topRes.json()).items ?? [] : [],
        };
    } catch {
        /* backend kapalıysa varsayılan boş veriyle render edilir */
    }

    return <HomeFeedClient initialData={initialData} />;
}
