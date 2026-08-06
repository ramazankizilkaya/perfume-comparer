"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Yeni bir sayfaya geçildiğinde sayfayı en üste alır.
 *
 * Sayfaların hepsi istemci tarafında veri çekiyor: geçiş anında hedef sayfa
 * kısa bir "Yükleniyor…" bloğu olarak açılıyor, veri gelince uzuyor. Bu arada
 * tarayıcı eski kaydırma konumunu koruyabiliyor ve sayfa ortasından açılmış
 * gibi görünüyor. Burada yolu izleyip her değişimde başa sarıyoruz.
 *
 * Geri/ileri tuşunda karışmıyoruz: orada kullanıcının bıraktığı yere dönmesi
 * doğru davranış, onu tarayıcı hallediyor.
 */
export default function ScrollToTop() {
    const pathname = usePathname();
    const cameFromHistory = useRef(false);

    useEffect(() => {
        const onPopState = () => {
            cameFromHistory.current = true;
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    useEffect(() => {
        if (cameFromHistory.current) {
            cameFromHistory.current = false;
            return;
        }
        window.scrollTo(0, 0);
    }, [pathname]);

    // Zaten açık olan sayfanın kendi bağlantısına tıklamak (ör. Chanel sayfasındaki
    // bir karttan "Chanel"e basmak) yolu değiştirmediği için üstteki etki çalışmaz.
    // Kullanıcı bir yere gitmeyi bekliyor; en azından başa saralım.
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            // defaultPrevented'a bakmıyoruz: Next'in Link'i kendi yönlendirmesi için
            // olayı zaten iptal ediyor ve bu dinleyici ondan sonra çalışıyor.
            if (event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!anchor || anchor.target === "_blank") return;

            const target = new URL(anchor.href, window.location.href);
            if (target.origin !== window.location.origin) return;
            if (target.hash) return;                               // #bölüm bağlantısı: tarayıcı halletsin
            if (target.pathname !== window.location.pathname) return; // yol değişiyor: üstteki etki halleder

            window.scrollTo(0, 0);
        };

        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, []);

    return null;
}
