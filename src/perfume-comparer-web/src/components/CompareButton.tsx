"use client";

import Icon from "./Icon";
import { useCompare, MAX_COMPARE, type PerfumeRef } from "@/lib/stores";

export default function CompareButton({
    perfume,
    block,
    className,
    iconOnly,
}: {
    perfume: PerfumeRef;
    block?: boolean;
    className?: string;
    iconOnly?: boolean;
}) {
    const { has, isFull, toggle, ready } = useCompare();
    const inList = ready && has(perfume.slug);
    const disabled = !inList && isFull;

    const baseClass = className ?? `btn btn-sm ${inList ? "btn-primary" : "btn-ghost"}${block ? " btn-block" : ""}`;

    const tooltipText = inList
        ? "Karşılaştırmadan çıkar"
        : disabled
        ? `Maksimum ${MAX_COMPARE} parfüm`
        : "Karşılaştırmaya ekle";

    return (
        <button
            type="button"
            className={`${baseClass} has-tooltip ${inList ? " is-active" : ""}`}
            data-tooltip={tooltipText}
            disabled={disabled}
            aria-label={tooltipText}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(perfume);
            }}
        >
            <Icon name={inList ? "check" : "layers"} size={14} />
            {!iconOnly && !className && (inList ? "Listede" : "Karşılaştır")}
        </button>
    );
}
