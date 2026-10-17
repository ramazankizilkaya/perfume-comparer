/**
 * Kaynak veride "3", "4" gibi sadece rakamdan oluşan ve oranı %0 olan sahte akorlar var
 * (517 parfüm). Veri temizlenene kadar arayüz bunları hiç göstermez.
 */
export function isVisibleAccord(accord: { name: string; width?: number | null }): boolean {
    const name = (accord.name ?? "").trim();
    if (!name || /^\d+$/.test(name)) return false;
    if (typeof accord.width === "number" && Math.round(accord.width) <= 0) return false;
    return true;
}

export function visibleAccords<T extends { name: string; width?: number | null }>(accords?: T[] | null): T[] {
    return (accords ?? []).filter(isVisibleAccord);
}
