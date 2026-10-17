/**
 * Başlık, H1 ve alt metinlerde marka adı bir kez geçsin:
 * "Dior Sauvage" olur, "Dior Dior Homme" veya "Versace Versace Pour Homme" olmaz.
 * Hem { brand: { name } } hem { brandName } biçimindeki nesnelerle çalışır.
 */
export function fullPerfumeName(perfume: {
    name: string;
    brand?: { name?: string | null } | null;
    brandName?: string | null;
}): string {
    const brandName = (perfume.brand?.name ?? perfume.brandName ?? "").trim();
    if (!brandName) return perfume.name;
    return perfume.name.toLocaleLowerCase("tr").includes(brandName.toLocaleLowerCase("tr"))
        ? perfume.name
        : `${brandName} ${perfume.name}`;
}
