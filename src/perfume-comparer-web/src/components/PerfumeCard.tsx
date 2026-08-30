import Link from "next/link";
import Icon from "./Icon";
import FavButton from "./FavButton";
import CompareButton from "./CompareButton";
import { ConcentrationBadge, FamilyBadge } from "./Badges";
import { perfumeHref, brandHref, mediaUrl } from "@/lib/urls";
import type { PerfumeRef } from "@/lib/stores";

export interface PerfumeCardData {
    name: string;
    slug: string;
    brand: { name: string; slug: string };
    gender: string;
    concentration?: string | null;
    fragranceFamily?: string | null;
    releaseYear?: number | null;
    imageUrl?: string | null;
    avgRating: number;
    ratingCount: number;
    accords?: string[];
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

    return (
        <article className="card card-clean">
            <div className="card-media">
                <Link href={href} className="card-media-link" aria-label={perfume.name}>
                    <img src={mediaUrl(perfume.imageUrl) || PLACEHOLDER} alt={perfume.name} loading="lazy" />
                </Link>
                <div className="card-hover-actions">
                    <FavButton perfume={ref} className="card-action-btn" />
                    <CompareButton perfume={ref} className="card-action-btn" />
                </div>
            </div>
            <div className="card-body">
                <Link href={brandHref(perfume.brand.slug)} className="card-brand" title={`${perfume.brand.name} markasının tüm parfümleri`}>
                    {perfume.brand.name}
                </Link>
                <Link href={href} className="card-title" title={perfume.name}>
                    {perfume.name}
                </Link>
                <div className="card-badge-row">
                    <div className="card-badge-left">
                        <ConcentrationBadge concentration={perfume.concentration} />
                        <FamilyBadge family={perfume.fragranceFamily} />
                    </div>
                    {perfume.avgRating > 0 && (
                        <span className="card-rating-badge" title={`Fragrantica Puanı: ${perfume.avgRating.toFixed(2)} (${perfume.ratingCount} oy)`}>
                            <Icon name="star" filled size={11} />
                            <span>{perfume.avgRating.toFixed(1)}</span>
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}

export function PerfumeRank({ perfume, rank }: { perfume: PerfumeCardData; rank: number }) {
    const href = perfumeHref(perfume.path, perfume.slug);

    return (
        <div className="rank-row">
            <span className="rank-num">{rank}</span>
            <Link href={href} aria-label={perfume.name}>
                <img className="rank-thumb" src={mediaUrl(perfume.imageUrl) || PLACEHOLDER} alt="" loading="lazy" />
            </Link>
            <div className="rank-body">
                <Link href={href} className="rank-name">
                    {perfume.brand.name} {perfume.name}
                </Link>
            </div>
        </div>
    );
}
