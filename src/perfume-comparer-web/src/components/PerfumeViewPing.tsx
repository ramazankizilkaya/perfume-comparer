"use client";

import { useEffect, useRef } from "react";
import { API_BASE } from "@/lib/urls";

/**
 * Görüntülenme sayacı. Sayfa sunucuda hazırlandığı için API'yi ziyaretçinin değil Next
 * sunucusunun IP'si çağırır ve sayaç herkesi tek kişi sanırdı. Bu bileşen tarayıcıdan,
 * sayfa açılışı başına bir kez `POST /api/perfumes/{slug}/view` atar; IP ve tekrar
 * sayma kuralı API tarafında uygulanır. Yanıt beklenmez, hata sessizce yutulur.
 */
export default function PerfumeViewPing({ slug }: { slug: string }) {
    const sentFor = useRef<string | null>(null);

    useEffect(() => {
        if (!slug || sentFor.current === slug) return;
        sentFor.current = slug;
        fetch(`${API_BASE}/api/perfumes/${encodeURIComponent(slug)}/view`, {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest" },
            keepalive: true,
        }).catch(() => {
            /* sayaç kritik değil */
        });
    }, [slug]);

    return null;
}
