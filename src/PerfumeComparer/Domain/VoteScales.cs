namespace PerfumeComparer.Domain;

/// <summary>
/// Oylama ölçeklerinin Türkçe etiketleri ve slug'ları.
/// Kalıcılık, yayılım, cinsiyet, fiyat ve puan dağılımı barları buradan isimlendirilir;
/// tek kaynak burası olsun ki API ile arayüz asla ayrışmasın.
/// </summary>
public static class VoteScales
{
    /// <summary>Ölçekteki tek bir seçenek.</summary>
    public readonly record struct Step(string Label, string Slug);

    public static readonly Step[] Rating =
    [
        new("Bayıldım", "bayildim"),
        new("Beğendim", "begendim"),
        new("İdare eder", "idare-eder"),
        new("Sevmedim", "sevmedim"),
        new("Nefret ettim", "nefret-ettim"),
    ];

    public static readonly Step[] Longevity =
    [
        new("Çok zayıf", "cok-zayif"),
        new("Zayıf", "zayif"),
        new("Orta", "orta"),
        new("Uzun süreli", "uzun-sureli"),
        new("Çok uzun süreli", "cok-uzun-sureli"),
    ];

    public static readonly Step[] Sillage =
    [
        new("Kişisel", "kisisel"),
        new("Orta", "orta"),
        new("Güçlü", "guclu"),
        new("Çok güçlü", "cok-guclu"),
    ];

    public static readonly Step[] GenderVote =
    [
        new("Kadın", "kadin"),
        new("Daha çok kadın", "daha-cok-kadin"),
        new("Unisex", "unisex"),
        new("Daha çok erkek", "daha-cok-erkek"),
        new("Erkek", "erkek"),
    ];

    public static readonly Step[] Price =
    [
        new("Çok pahalı", "cok-pahali"),
        new("Pahalı", "pahali"),
        new("Makul", "makul"),
        new("Uygun", "uygun"),
        new("Çok uygun", "cok-uygun"),
    ];

    public static readonly Step[] TimeOfDay =
    [
        new("Gündüz", "gunduz"),
        new("Gece", "gece"),
    ];
}
