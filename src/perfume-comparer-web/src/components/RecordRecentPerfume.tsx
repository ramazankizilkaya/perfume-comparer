"use client";

import { useEffect } from "react";
import { useRecentPerfumes, type RecentPerfume } from "@/lib/stores";

export default function RecordRecentPerfume({ perfume }: { perfume: RecentPerfume }) {
    const { addRecent } = useRecentPerfumes();

    useEffect(() => {
        if (perfume?.slug) {
            addRecent(perfume);
        }
    }, [perfume, addRecent]);

    return null;
}
