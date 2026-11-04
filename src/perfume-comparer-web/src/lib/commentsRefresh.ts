"use client";

/**
 * Değerlendirme penceresi yorum kaydedince yorum bölümüne haber verir.
 * Sayfa yorum listesini 60 saniye önbellekte tuttuğu için router.refresh() yeni yorumu getirmez;
 * yorum bölümü bu haberi alınca listeyi API'den kendisi yeniden çeker.
 */
const listeners = new Set<(slug: string) => void>();

export function notifyCommentsChanged(slug: string) {
    listeners.forEach((l) => l(slug));
}

export function onCommentsChanged(listener: (slug: string) => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
