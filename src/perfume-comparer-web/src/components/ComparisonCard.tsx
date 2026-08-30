import Link from "next/link";
import { mediaUrl } from "@/lib/urls";
import { ConcentrationBadge, FamilyBadge } from "./Badges";

export interface ComparisonItemData {
    name: string;
    slug: string;
    brandName: string;
    imageUrl?: string | null;
    gender: string;
    concentration?: string | null;
    fragranceFamily?: string | null;
    path: string;
}

export interface ComparisonPairData {
    perfume1: ComparisonItemData;
    perfume2: ComparisonItemData;
}

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=400";

export default function ComparisonCard({ pair }: { pair: ComparisonPairData }) {
    const compareHref = `/karsilastir?parfumler=${pair.perfume1.slug},${pair.perfume2.slug}`;

    return (
        <article className="compare-card">
            <Link href={compareHref} className="compare-card-link">
                <div className="compare-sides">
                    <div className="compare-side">
                        <div className="compare-img-wrap">
                            <img
                                src={mediaUrl(pair.perfume1.imageUrl) || PLACEHOLDER}
                                alt={pair.perfume1.name}
                                loading="lazy"
                            />
                        </div>
                        <span className="compare-brand">{pair.perfume1.brandName}</span>
                        <strong className="compare-title" title={pair.perfume1.name}>
                            {pair.perfume1.name}
                        </strong>
                        <div className="compare-badges">
                            <ConcentrationBadge concentration={pair.perfume1.concentration} />
                            <FamilyBadge family={pair.perfume1.fragranceFamily} />
                        </div>
                    </div>

                    <div className="compare-vs-badge">VS</div>

                    <div className="compare-side">
                        <div className="compare-img-wrap">
                            <img
                                src={mediaUrl(pair.perfume2.imageUrl) || PLACEHOLDER}
                                alt={pair.perfume2.name}
                                loading="lazy"
                            />
                        </div>
                        <span className="compare-brand">{pair.perfume2.brandName}</span>
                        <strong className="compare-title" title={pair.perfume2.name}>
                            {pair.perfume2.name}
                        </strong>
                        <div className="compare-badges">
                            <ConcentrationBadge concentration={pair.perfume2.concentration} />
                            <FamilyBadge family={pair.perfume2.fragranceFamily} />
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    );
}
