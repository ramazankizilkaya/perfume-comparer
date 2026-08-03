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
                <span className="compare-bar-label">
                    Karşılaştırma listesi <strong>{items.length}/4</strong>
                </span>

                <div className="compare-bar-items">
                    {items.map((i) => (
                        <div key={i.slug} className="compare-chip" title={i.name}>
                            <img src={mediaUrl(i.imageUrl) || PLACEHOLDER} alt="" />
                            <span className="compare-chip-name">{i.name}</span>
                            <button onClick={() => remove(i.slug)} aria-label={`${i.name} listeden çıkar`}>
                                <Icon name="close" size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="compare-bar-actions">
                    <button className="link-more" onClick={clear}>Temizle</button>
                    {canCompare ? (
                        <Link href={href} className="btn btn-primary btn-sm">
                            <Icon name="swap" size={14} /> Karşılaştır
                        </Link>
                    ) : (
                        <button className="btn btn-primary btn-sm" disabled title="En az 2 parfüm ekleyin">
                            <Icon name="swap" size={14} /> Karşılaştır
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
