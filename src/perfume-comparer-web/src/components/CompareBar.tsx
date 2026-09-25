"use client";

import Link from "next/link";
import { mediaUrl } from "@/lib/urls";
import Icon from "./Icon";
import { useCompare } from "@/lib/stores";

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=200";

export default function CompareBar() {
    const { items, remove, clear, ready } = useCompare();

    if (!ready || items.length === 0) return null;

    const href = `/karsilastir?items=${items.map((i) => i.slug).join(",")}`;
    const canCompare = items.length >= 2;

    return (
        <div className="compare-bar" role="region" aria-label="Karşılaştırma listesi">
            <div className="shell compare-bar-inner">
                <div className="compare-bar-label-wrap">
                    <span className="compare-bar-label">
                        Karşılaştırma <strong>{items.length}/4</strong>
                    </span>
                    <button type="button" className="link-more compare-bar-clear-mobile" onClick={clear}>
                        Temizle
                    </button>
                </div>

                <div className="compare-bar-items">
                    {items.map((i) => (
                        <div key={i.slug} className="compare-chip" title={i.name}>
                            <img src={mediaUrl(i.imageUrl) || PLACEHOLDER} alt={`${i.brandName} ${i.name}`} />
                            <span className="compare-chip-name">{i.name}</span>
                            <button type="button" onClick={() => remove(i.slug)} aria-label={`${i.name} listeden çıkar`}>
                                <Icon name="close" size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="compare-bar-actions">
                    <button type="button" className="link-more compare-bar-clear-desktop" onClick={clear}>
                        Temizle
                    </button>
                    {canCompare ? (
                        <Link href={href} className="btn btn-primary btn-sm compare-bar-btn">
                            <Icon name="swap" size={14} /> Karşılaştır
                        </Link>
                    ) : (
                        <button type="button" className="btn btn-primary btn-sm compare-bar-btn" disabled title="En az 2 parfüm ekleyin">
                            <Icon name="swap" size={14} /> Karşılaştır
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
