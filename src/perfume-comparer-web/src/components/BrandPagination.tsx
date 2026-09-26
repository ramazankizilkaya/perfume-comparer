import Link from "next/link";
import Icon from "./Icon";
import { brandHref } from "@/lib/urls";

interface BrandPaginationProps {
    brandSlug: string;
    currentPage: number;
    totalPages: number;
}

export function getPaginationRange(currentPage: number, totalPages: number): (number | "...")[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 1;
    const range: number[] = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
    }
    const result: (number | "...")[] = [1];
    if (range[0] > 2) {
        result.push("...");
    }
    result.push(...range);
    if (range[range.length - 1] < totalPages - 1) {
        result.push("...");
    }
    result.push(totalPages);
    return result;
}

export default function BrandPagination({ brandSlug, currentPage, totalPages }: BrandPaginationProps) {
    if (totalPages <= 1) return null;

    const pageUrl = (p: number) => (p === 1 ? brandHref(brandSlug) : `${brandHref(brandSlug)}?sayfa=${p}`);
    const items = getPaginationRange(currentPage, totalPages);

    return (
        <nav className="pagination-nav" aria-label="Sayfalama">
            {currentPage > 1 ? (
                <Link href={pageUrl(currentPage - 1)} className="pagination-btn pagination-prev" aria-label="Önceki sayfa">
                    <Icon name="arrow-left" size={14} />
                    <span>Önceki</span>
                </Link>
            ) : (
                <span className="pagination-btn pagination-disabled" aria-disabled="true">
                    <Icon name="arrow-left" size={14} />
                    <span>Önceki</span>
                </span>
            )}

            <div className="pagination-pages">
                {items.map((item, idx) => {
                    if (item === "...") {
                        return (
                            <span key={`dots-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                                …
                            </span>
                        );
                    }
                    const isCurrent = item === currentPage;
                    return (
                        <Link
                            key={item}
                            href={pageUrl(item)}
                            className={`pagination-number ${isCurrent ? "pagination-current" : ""}`}
                            aria-current={isCurrent ? "page" : undefined}
                        >
                            {item}
                        </Link>
                    );
                })}
            </div>

            {currentPage < totalPages ? (
                <Link href={pageUrl(currentPage + 1)} className="pagination-btn pagination-next" aria-label="Sonraki sayfa">
                    <span>Sonraki</span>
                    <Icon name="arrow-right" size={14} />
                </Link>
            ) : (
                <span className="pagination-btn pagination-disabled" aria-disabled="true">
                    <span>Sonraki</span>
                    <Icon name="arrow-right" size={14} />
                </span>
            )}
        </nav>
    );
}
