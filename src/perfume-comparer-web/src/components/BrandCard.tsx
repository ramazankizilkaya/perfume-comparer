import Link from "next/link";
import { brandHref, mediaUrl } from "@/lib/urls";

export interface BrandCardData {
    id: number;
    name: string;
    slug: string;
    logoUrl?: string | null;
    country?: string | null;
    perfumeCount: number;
}

export default function BrandCard({ brand }: { brand: BrandCardData }) {
    const logo = mediaUrl(brand.logoUrl);
    return (
        <Link
            href={brandHref(brand.slug)}
            className="brand-card"
            title={brand.name}
            aria-label={`${brand.name} parfümleri`}
        >
            {logo ? (
                <img src={logo} alt={brand.name} className="brand-card-logo" loading="lazy" />
            ) : (
                <span className="brand-card-fallback">{brand.name}</span>
            )}
            <span className="brand-card-hover-name">{brand.name}</span>
        </Link>
    );
}
