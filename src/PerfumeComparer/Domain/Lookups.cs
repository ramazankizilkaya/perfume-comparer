namespace PerfumeComparer.Domain;

/// <summary>
/// Enum'a çevrilen lookup'ların görünen adı (Türkçe), URL slug'ı ve (koku ailesi için) açıklaması.
/// API bu değerlerle eskisiyle birebir aynı JSON'u döndürür; frontend değişmez.
/// </summary>
public static class Lookups
{
    // --- Season ------------------------------------------------------------
    public static string Label(this Season s) => s switch
    {
        Season.Spring => "İlkbahar",
        Season.Summer => "Yaz",
        Season.Autumn => "Sonbahar",
        Season.Winter => "Kış",
        _ => s.ToString(),
    };

    public static string Slug(this Season s) => s switch
    {
        Season.Spring => "ilkbahar",
        Season.Summer => "yaz",
        Season.Autumn => "sonbahar",
        Season.Winter => "kis",
        _ => s.ToString().ToLowerInvariant(),
    };

    public static Season? SeasonFromSlug(string? slug) => slug?.Trim().ToLowerInvariant() switch
    {
        "ilkbahar" => Season.Spring,
        "yaz" => Season.Summer,
        "sonbahar" => Season.Autumn,
        "kis" or "kış" => Season.Winter,
        _ => null,
    };

    // --- AgeGroup ----------------------------------------------------------
    public static string Label(this AgeGroup a) => a switch
    {
        AgeGroup.Young => "Genç",
        AgeGroup.MiddleAge => "Orta Yaş",
        AgeGroup.Mature => "Olgun",
        AgeGroup.Other => "Diğer",
        _ => a.ToString(),
    };

    public static string Slug(this AgeGroup a) => a switch
    {
        AgeGroup.Young => "genc",
        AgeGroup.MiddleAge => "orta-yas",
        AgeGroup.Mature => "olgun",
        AgeGroup.Other => "diger",
        _ => a.ToString().ToLowerInvariant(),
    };

    public static AgeGroup? AgeGroupFromSlug(string? slug) => slug?.Trim().ToLowerInvariant() switch
    {
        "genc" => AgeGroup.Young,
        "orta-yas" => AgeGroup.MiddleAge,
        "olgun" => AgeGroup.Mature,
        "diger" or "diğer" => AgeGroup.Other,
        _ => null,
    };

    // --- Concentration -----------------------------------------------------
    public static string Label(this Concentration c) => c switch
    {
        Concentration.Edt => "EDT",
        Concentration.Edp => "EDP",
        Concentration.Edc => "EDC",
        Concentration.EauFraiche => "Eau Fraiche",
        Concentration.Parfum => "Parfum",
        Concentration.Extrait => "Extrait de Parfum",
        Concentration.Cologne => "Cologne",
        Concentration.RollOn => "Roll-on",
        Concentration.Other => "Diğer",
        _ => c.ToString(),
    };

    public static string Slug(this Concentration c) => c switch
    {
        Concentration.Edt => "edt",
        Concentration.Edp => "edp",
        Concentration.Edc => "edc",
        Concentration.EauFraiche => "eau-fraiche",
        Concentration.Parfum => "parfum",
        Concentration.Extrait => "extrait-de-parfum",
        Concentration.Cologne => "cologne",
        Concentration.RollOn => "roll-on",
        Concentration.Other => "diger",
        _ => c.ToString().ToLowerInvariant(),
    };

    public static Concentration? ConcentrationFromSlug(string? slug) => slug?.Trim().ToLowerInvariant() switch
    {
        "edt" => Concentration.Edt,
        "edp" => Concentration.Edp,
        "edc" => Concentration.Edc,
        "eau-fraiche" => Concentration.EauFraiche,
        "parfum" => Concentration.Parfum,
        "extrait-de-parfum" or "extrait" => Concentration.Extrait,
        "cologne" => Concentration.Cologne,
        "roll-on" or "rollon" => Concentration.RollOn,
        "diger" or "diğer" => Concentration.Other,
        _ => null,
    };

    /// <summary>Seed: parfüm adından çıkan konsantrasyon adını ("EDP") enuma çevirir.</summary>
    public static Concentration? ConcentrationFromName(string? name) => name?.Trim().ToLowerInvariant() switch
    {
        "edt" => Concentration.Edt,
        "edp" => Concentration.Edp,
        "edc" => Concentration.Edc,
        "eau fraiche" => Concentration.EauFraiche,
        "parfum" => Concentration.Parfum,
        "extrait de parfum" => Concentration.Extrait,
        "cologne" => Concentration.Cologne,
        "roll-on" => Concentration.RollOn,
        "diğer" or "diger" => Concentration.Other,
        _ => null,
    };

    // --- FragranceFamily ---------------------------------------------------
    public static string Label(this FragranceFamily f) => f switch
    {
        FragranceFamily.Floral => "Çiçeksi",
        FragranceFamily.Oriental => "Oryantal",
        FragranceFamily.Woody => "Odunsu",
        FragranceFamily.Fresh => "Ferah",
        FragranceFamily.Citrus => "Narenciye",
        FragranceFamily.Gourmand => "Gurme",
        FragranceFamily.Aromatic => "Aromatik",
        FragranceFamily.Fougere => "Fujer",
        FragranceFamily.Leather => "Deri",
        FragranceFamily.Chypre => "Chypre",
        FragranceFamily.Other => "Diğer",
        _ => f.ToString(),
    };

    public static string Slug(this FragranceFamily f) => f switch
    {
        FragranceFamily.Floral => "ciceksi",
        FragranceFamily.Oriental => "oryantal",
        FragranceFamily.Woody => "odunsu",
        FragranceFamily.Fresh => "ferah",
        FragranceFamily.Citrus => "narenciye",
        FragranceFamily.Gourmand => "gurme",
        FragranceFamily.Aromatic => "aromatik",
        FragranceFamily.Fougere => "fujer",
        FragranceFamily.Leather => "deri",
        FragranceFamily.Chypre => "chypre",
        FragranceFamily.Other => "diger",
        _ => f.ToString().ToLowerInvariant(),
    };

    public static string Description(this FragranceFamily f) => f switch
    {
        FragranceFamily.Floral => "Gül, yasemin ve beyaz çiçeklerin öne çıktığı zarif kokular.",
        FragranceFamily.Oriental => "Amber, vanilya ve baharatın sıcak, baştan çıkarıcı dünyası.",
        FragranceFamily.Woody => "Sandal, sedir ve vetiver eksenli kuru, sofistike kokular.",
        FragranceFamily.Fresh => "Deniz, yeşil notalar ve temiz akuatik dokular.",
        FragranceFamily.Citrus => "Bergamot, limon ve portakalın canlı, ışıltılı açılışı.",
        FragranceFamily.Gourmand => "Vanilya, karamel ve kakao gibi yenilebilir tatlı notalar.",
        FragranceFamily.Aromatic => "Lavanta, adaçayı ve aromatik bitkilerin klasik dokusu.",
        FragranceFamily.Fougere => "Lavanta, kumarin ve meşe yosunu üçlüsüne dayanan klasik yapı.",
        FragranceFamily.Leather => "Deri, tütün ve is notalarıyla iddialı, karakterli kokular.",
        FragranceFamily.Chypre => "Bergamot, labdanum ve meşe yosunu kontrastına kurulu klasik aile.",
        FragranceFamily.Other => "Diğer koku grupları ve harmanlar.",
        _ => "",
    };

    public static FragranceFamily? FamilyFromSlug(string? slug) => slug?.Trim().ToLowerInvariant() switch
    {
        "ciceksi" => FragranceFamily.Floral,
        "oryantal" => FragranceFamily.Oriental,
        "odunsu" => FragranceFamily.Woody,
        "ferah" => FragranceFamily.Fresh,
        "narenciye" => FragranceFamily.Citrus,
        "gurme" => FragranceFamily.Gourmand,
        "aromatik" => FragranceFamily.Aromatic,
        "fujer" => FragranceFamily.Fougere,
        "deri" => FragranceFamily.Leather,
        "chypre" => FragranceFamily.Chypre,
        "diger" or "diğer" => FragranceFamily.Other,
        _ => null,
    };

    /// <summary>Seed: kuraldaki Türkçe aile adını ("Deri") enuma çevirir.</summary>
    public static FragranceFamily? FamilyFromName(string? name) => name?.Trim().ToLowerInvariant() switch
    {
        "çiçeksi" or "ciceksi" => FragranceFamily.Floral,
        "oryantal" => FragranceFamily.Oriental,
        "odunsu" => FragranceFamily.Woody,
        "ferah" => FragranceFamily.Fresh,
        "narenciye" => FragranceFamily.Citrus,
        "gurme" => FragranceFamily.Gourmand,
        "aromatik" => FragranceFamily.Aromatic,
        "fujer" => FragranceFamily.Fougere,
        "deri" => FragranceFamily.Leather,
        "chypre" => FragranceFamily.Chypre,
        "diğer" or "diger" => FragranceFamily.Other,
        _ => null,
    };

    // --- Accord -> FragranceFamily -------------------------------------------
    /// <summary>
    /// Kaynak veride koku ailesi alanı yok; sadece ana akorlar var.
    /// Parfümün en baskın akoru buradaki eşlemeyle bir aileye çevrilir,
    /// böylece filtreler ve /ara sayfası çalışmaya devam eder.
    /// </summary>
    public static FragranceFamily? FamilyFromAccord(string? accordName) => accordName?.Trim().ToLowerInvariant() switch
    {
        "narenciye" or "tuzlu" or "ekşi" => FragranceFamily.Citrus,
        "çiçeksi" or "beyaz çiçeksi" or "sarı çiçeksi" or "gül" or "iris" or "menekşe" or "tüberöz" or "pudralı"
            => FragranceFamily.Floral,
        "odunsu" or "paçuli" or "ud" or "toprak" or "kozalaklı" or "kum" => FragranceFamily.Woody,
        "amber" or "balsamik" or "vanilya" or "bal" or "balmumu" or "rom" => FragranceFamily.Oriental,
        "tatlı" or "karamel" or "çikolata" or "kakao" or "kahve" or "badem" or "fındıksı" or "hindistancevizi"
            or "laktonik" or "sütlü" or "gurme" or "kiraz" or "meyvemsi" or "tropikal" => FragranceFamily.Gourmand,
        "taze" or "sulu" or "deniz" or "ozonik" or "mineral" or "yeşil" or "sabunsu" or "metalik" or "aldehitli"
            or "kafur" => FragranceFamily.Fresh,
        "aromatik" or "bitkisel" or "anason" or "taze baharatlı" or "sıcak baharatlı" or "yumuşak baharatlı"
            or "baharatlı" or "tarçın" or "terpenik" => FragranceFamily.Aromatic,
        "lavanta" or "yosunlu" => FragranceFamily.Fougere,
        "deri" or "animalik" or "misk" or "dumanlı" or "tütün" => FragranceFamily.Leather,
        null or "" => null,
        _ => FragranceFamily.Other,
    };
}
