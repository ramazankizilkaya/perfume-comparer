"use client";

import Icon from "./Icon";
import { useCompare, MAX_COMPARE, type PerfumeRef } from "@/lib/stores";

export default function CompareButton({ perfume, block }: { perfume: PerfumeRef; block?: boolean }) {
    const { has, isFull, toggle, ready } = useCompare();
    const inList = ready && has(perfume.slug);
    const disabled = !inList && isFull;

    return (
        <button
            type="button"
            className={`btn btn-sm ${inList ? "btn-primary" : "btn-ghost"}${block ? " btn-block" : ""}`}
            disabled={disabled}
            title={disabled ? `En fazla ${MAX_COMPARE} parfüm karşılaştırabilirsiniz` : undefined}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(perfume);
            }}
        >
            <Icon name={inList ? "check" : "plus"} size={14} />
            {inList ? "Listede" : "Karşılaştır"}
        </button>
    );
}
