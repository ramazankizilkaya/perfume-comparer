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

    // --- Note --------------------------------------------------------------
    public static string Label(this Note n) => n switch
    {
        Note.Bergamot => "Bergamot",
        Note.Lemon => "Limon",
        Note.Lavender => "Lavanta",
        Note.Ambroxan => "Ambroxan",
        Note.Vanilla => "Vanilya",
        Note.Oud => "Oud",
        Note.Cedar => "Sedir",
        Note.Vetiver => "Vetiver",
        Note.Patchouli => "Paçuli",
        Note.BlackPepper => "Kara Biber",
        Note.Cinnamon => "Tarçın",
        Note.Rose => "Gül",
        Note.Jasmine => "Yasemin",
        Note.Musk => "Misk",
        Note.Leather => "Deri",
        Note.Tobacco => "Tütün",
        Note.Mandarin => "Mandalina",
        Note.Grapefruit => "Greyfurt",
        Note.OrangeBlossom => "Portakal Çiçeği",
        Note.Iris => "İris",
        Note.Amber => "Amber",
        Note.TonkaBean => "Tonka Fasulyesi",
        Note.Cardamom => "Kardamom",
        Note.PinkPepper => "Pembe Biber",
        Note.Sandalwood => "Sandal Ağacı",
        Note.Fig => "İncir",
        Note.SeaNotes => "Deniz Notaları",
        Note.Mint => "Nane",
        Note.Other => "Diğer",
        _ => n.ToString(),
    };

    public static string Slug(this Note n) => n switch
    {
        Note.Bergamot => "bergamot",
        Note.Lemon => "limon",
        Note.Lavender => "lavanta",
        Note.Ambroxan => "ambroxan",
        Note.Vanilla => "vanilya",
        Note.Oud => "oud",
        Note.Cedar => "sedir",
        Note.Vetiver => "vetiver",
        Note.Patchouli => "paculi",
        Note.BlackPepper => "kara-biber",
        Note.Cinnamon => "tarcin",
        Note.Rose => "gul",
        Note.Jasmine => "yasemin",
        Note.Musk => "misk",
        Note.Leather => "deri-notasi",
        Note.Tobacco => "tutun",
        Note.Mandarin => "mandalina",
        Note.Grapefruit => "greyfurt",
        Note.OrangeBlossom => "portakal-cicegi",
        Note.Iris => "iris",
        Note.Amber => "amber",
        Note.TonkaBean => "tonka-fasulyesi",
        Note.Cardamom => "kardamom",
        Note.PinkPepper => "pembe-biber",
        Note.Sandalwood => "sandal-agaci",
        Note.Fig => "incir",
        Note.SeaNotes => "deniz-notalari",
        Note.Mint => "nane",
        Note.Other => "diger",
        _ => n.ToString().ToLowerInvariant(),
    };

    /// <summary>Notanın ait olduğu koku ailesi (görsel gruplama için).</summary>
    public static string Category(this Note n) => n switch
    {
        Note.Bergamot or Note.Lemon or Note.Mandarin or Note.Grapefruit => "Narenciye",
        Note.Lavender or Note.Mint => "Aromatik",
        Note.Ambroxan or Note.Amber => "Amber",
        Note.Vanilla or Note.TonkaBean => "Tatlı",
        Note.Oud or Note.Cedar or Note.Vetiver or Note.Patchouli or Note.Sandalwood => "Odunsu",
        Note.BlackPepper or Note.Cinnamon or Note.Cardamom or Note.PinkPepper => "Baharatlı",
        Note.Rose or Note.Jasmine or Note.OrangeBlossom or Note.Iris => "Çiçeksi",
        Note.Musk => "Hayvansal",
        Note.Leather => "Deri",
        Note.Tobacco => "Tütün",
        Note.Fig or Note.SeaNotes => "Ferah",
        Note.Other => "Diğer",
        _ => "",
    };

    public static Note? NoteFromSlug(string? slug) => slug?.Trim().ToLowerInvariant() switch
    {
        "bergamot" => Note.Bergamot,
        "limon" => Note.Lemon,
        "lavanta" => Note.Lavender,
        "ambroxan" => Note.Ambroxan,
        "vanilya" => Note.Vanilla,
        "oud" => Note.Oud,
        "sedir" => Note.Cedar,
        "vetiver" => Note.Vetiver,
        "paculi" or "paçuli" => Note.Patchouli,
        "kara-biber" => Note.BlackPepper,
        "tarcin" or "tarçın" => Note.Cinnamon,
        "gul" or "gül" => Note.Rose,
        "yasemin" => Note.Jasmine,
        "misk" => Note.Musk,
        "deri-notasi" => Note.Leather,
        "tutun" or "tütün" => Note.Tobacco,
        "mandalina" => Note.Mandarin,
        "greyfurt" => Note.Grapefruit,
        "portakal-cicegi" or "portakal-çiçeği" => Note.OrangeBlossom,
        "iris" or "süsen" => Note.Iris,
        "amber" => Note.Amber,
        "tonka-fasulyesi" => Note.TonkaBean,
        "kardamom" or "kakule" => Note.Cardamom,
        "pembe-biber" => Note.PinkPepper,
        "sandal-agaci" or "sandal-ağacı" => Note.Sandalwood,
        "incir" => Note.Fig,
        "deniz-notalari" or "deniz-notaları" => Note.SeaNotes,
        "nane" => Note.Mint,
        "diger" or "diğer" => Note.Other,
        _ => null,
    };

    // --- Concentration -----------------------------------------------------
    public static string Label(this Concentration c) => c switch
    {
        Concentration.Edt => "EDT",
        Concentration.Edp => "EDP",
        Concentration.Edc => "EDC",
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
}
