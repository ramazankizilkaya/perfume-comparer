import React from "react";

export function getFamilyLabel(family?: string | null): string {
    if (!family) return "";
    const f = family.toLowerCase();
    if (f === "oriental" || f === "oryantal") return "oryantal";
    if (f === "woody" || f === "odunsu") return "odunsu";
    if (f === "fresh" || f === "ferah") return "ferah";
    if (f === "floral" || f === "çiçeksi" || f === "ciceksi") return "çiçeksi";
    if (f === "citrus" || f === "narenciye") return "narenciye";
    if (f === "gourmand" || f === "gurme") return "gurme";
    if (f === "aromatic" || f === "aromatik") return "aromatik";
    if (f === "fougere" || f === "fujer") return "fujer";
    if (f === "leather" || f === "deri") return "deri";
    if (f === "chypre") return "chypre";
    if (f === "other" || f === "diger" || f === "diğer") return "diğer";
    return family.toLowerCase();
}

export function ConcentrationBadge({ concentration }: { concentration?: string | null }) {
    if (!concentration) return null;
    return (
        <span className="badge badge-primary">
            {concentration.toLowerCase()}
        </span>
    );
}

export function FamilyBadge({ family }: { family?: string | null }) {
    if (!family) return null;
    return (
        <span className="badge badge-success">
            {getFamilyLabel(family)}
        </span>
    );
}
