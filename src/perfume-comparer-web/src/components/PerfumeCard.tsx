import Link from "next/link";
import Stars from "./Stars";
import Score from "./Score";
import FavButton from "./FavButton";
import CompareButton from "./CompareButton";
import { perfumeHref, genderLabel } from "@/lib/urls";
import type { PerfumeRef } from "@/lib/stores";

export interface PerfumeCardData {
    name: string;
    slug: string;
    brand: { name: string; slug: string };
    gender: string;
    concentration?: string | null;
    fragranceFamily?: string | null;
    imageUrl?: string | null;
    avgRating: number;
    ratingCount: number;
    path: string;
}

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=400";

function toRef(p: PerfumeCardData): PerfumeRef {
    return { slug: p.slug, name: p.name, brandName: p.brand.name, imageUrl: p.imageUrl, path: p.path };
}

export function PerfumeCard({ perfume }: { perfume: PerfumeCardData }) {
    const href = perfumeHref(perfume.path, perfume.slug);
    const ref = toRef(perfume);

    const specs = [
        perfume.fragranceFamily,
        perfume.concentration,
        genderLabel(perfume.gender),
    ].filter(Boolean) as string[];

    return (
        <article className="card">
            <div className="card-media">
                <Link href={href} className="card-media-link" aria-label={perfume.name}>
                    <img src={perfume.imageUrl || PLACEHOLDER} alt="" loading="lazy" />
                </Link>
                <FavButton perfume={ref} className="card-fav" />
            </div>
            <div className="card-body">
                <span className="card-brand">{perfume.brand.name}</span>
                <Link href={href} className="card-title">
                    {perfume.name}
                </Link>
                <div className="card-specs">
                    {specs.map((s) => (
                        <span key={s}>{s}</span>
                    ))}
                </div>
                <div className="card-foot">
                    <Stars value={perfume.avgRating} count={perfume.ratingCount} size={16} />
                </div>
                <CompareButton perfume={ref} block />
            </div>
        </article>
    );
}

/** Numaralı sıralama satırı — "en çok değerlendirilen" gibi listeler için. */
export function PerfumeRank({ perfume, rank }: { perfume: PerfumeCardData; rank: number }) {
    const href = perfumeHref(perfume.path, perfume.slug);

    return (
        <div className="rank-row">
            <span className="rank-num">{rank}</span>
            <Link href={href} aria-label={perfume.name}>
                <img className="rank-thumb" src={perfume.imageUrl || PLACEHOLDER} alt="" loading="lazy" />
            </Link>
            <div className="rank-body">
                <Link href={href} className="rank-name">
                    {perfume.brand.name} {perfume.name}
                </Link>
            </div>
            <Score value={perfume.avgRating} count={perfume.ratingCount} />
        </div>
    );
}
