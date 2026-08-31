using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

namespace PerfumeComparer.Business.Services;

/// <summary>Aramaya girmeden önce sorguyu sadeleştirir.</summary>
/// <param name="Raw">Kullanıcının yazdığı hâli.</param>
/// <param name="Text">Küçük harfe indirilmiş, Türkçe işaretleri sadeleştirilmiş, takma adları açılmış hâli.</param>
/// <param name="Tokens">Anlamsız dolgu kelimeleri atılmış kelime listesi.</param>
public record SearchTerms(string Raw, string Text, string[] Tokens)
{
    public bool IsEmpty => Text.Length == 0;
}

/// <summary>
/// Sorgu metnini veritabanındaki <c>f_unaccent(lower(...))</c> ile aynı biçime getirir.
/// Böylece SQL tarafında sorguyu tekrar dönüştürmeye gerek kalmaz ve trigram
/// index'leri doğrudan kullanılabilir.
/// </summary>
public static class SearchTextNormalizer
{
    /// <summary>Yazım hatası ve Türkçe okunuşla yazılan marka adları.</summary>
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.Ordinal)
    {
        ["bulgari"] = "bvlgari",
        ["bulgar"] = "bvlgari",
        ["diyor"] = "dior",
        ["sanel"] = "chanel",
        ["shanel"] = "chanel",
        ["akua"] = "acqua",
        ["aqua"] = "acqua",
        ["inviktus"] = "invictus",
        ["krid"] = "creed",
        ["tomfort"] = "tom ford",
        ["tomford"] = "tom ford",
        ["ysl"] = "yves saint laurent",
        ["jpg"] = "jean paul gaultier",
        ["marly"] = "parfums de marly",
        ["lattafe"] = "lattafa",
        ["xerjof"] = "xerjoff",
        ["versac"] = "versace",
        ["versaci"] = "versace",
        ["arman"] = "armani",
        ["hugo"] = "hugo boss",
        ["montblanc"] = "mont blanc",
        ["mercedes"] = "mercedes-benz",
        ["dolce"] = "dolce&gabbana",
        ["dg"] = "dolce&gabbana",
        ["ck"] = "calvin klein",
        ["pako"] = "paco rabanne",
        ["pacorabanne"] = "paco rabanne",
        ["jimmychoo"] = "jimmy choo",
        ["blucdsanel"] = "bleu de chanel",
        ["blue de chanel"] = "bleu de chanel",
        ["sovaj"] = "sauvage",
        ["sovage"] = "sauvage",
        ["savaj"] = "sauvage",
        ["savage"] = "sauvage",
        ["ovantus"] = "aventus",
        ["fantom"] = "phantom",
        ["skandal"] = "scandal",
        ["opiyum"] = "opium",
        ["oryantal"] = "oriental",
    };

    /// <summary>Kesme işaretinden sonra gelirse atılacak Türkçe çekim ekleri.</summary>
    private static readonly HashSet<string> CaseSuffixes = new(StringComparer.Ordinal)
    {
        "a", "e", "i", "in", "un", "nin", "nun", "da", "de", "ta", "te",
        "dan", "den", "tan", "ten", "ya", "ye", "na", "ne", "la", "le",
        "yla", "yle", "nan", "nen", "dir", "dur", "ler", "lar", "li", "lu",
        "nun", "sini", "sinin", "yi", "yu", "si", "su", "n", "s",
    };

    /// <summary>
    /// "dior'un" -> "dior" ama "j'adore" -> "j'adore". Kesme işaretinden sonraki
    /// parça Türkçe bir çekim ekiyse atılır, değilse kelime olduğu gibi kalır.
    /// </summary>
    private static string StripCaseSuffix(string word)
    {
        var apostrophe = word.LastIndexOf('\'');
        if (apostrophe <= 0 || apostrophe == word.Length - 1) return word;

        var stem = word[..apostrophe];
        var suffix = word[(apostrophe + 1)..];
        return stem.Length >= 3 && CaseSuffixes.Contains(suffix) ? stem : word;
    }

    /// <summary>Sonuçları daraltmayan dolgu kelimeler; token skorlamasında sayılmaz.</summary>
    private static readonly HashSet<string> StopWords = new(StringComparer.Ordinal)
    {
        "parfum", "parfumu", "parfumun", "parfume", "parfumler", "parfumleri",
        "koku", "kokusu", "kokular", "kokulari", "kokulu", "esans",
        // "safranlı notalı parfümler" gibi sorgularda "notalı" kelimesi
        // "Yeşil Notalar", "Sulu Notalar" gibi alakasız notalarla eşleşiyordu.
        "nota", "notasi", "notali", "notalar", "notalari", "notaya",
        "akor", "akoru", "akorlu", "akorlar", "akorlari",
        "bir", "bana", "benim", "icin", "ile", "ve", "veya", "olan", "olsun", "gibi",
        "en", "cok", "daha", "the", "de", "da", "mi", "mu", "ne", "var", "onerir", "oner",
        "onerebilir", "misin", "musun", "istiyorum", "arıyorum", "ariyorum", "lutfen",
    };

    /// <summary>
    /// Sorgunun cümle olduğunu ele veren kelimeler. Katalogdaki hiçbir parfüm ya
    /// da marka adında bunlar geçmez, dolayısıyla biri varsa arama doğal dildir.
    /// </summary>
    private static readonly HashSet<string> SentenceMarkers = new(StringComparer.Ordinal)
    {
        "bana", "benim", "bize", "icin", "gibi", "benzer", "benzeyen", "benzeri",
        "muadil", "muadili", "klon", "klonu", "dupe", "tarzinda",
        "oner", "onerir", "onerebilir", "onerisi", "tavsiye", "tavsiyesi",
        "istiyorum", "ariyorum", "lutfen", "misin", "musun", "mudur",
        "hangi", "nasil", "olur", "olsun", "olmayan", "olmasin", "olan",
        "kullanabilecegim", "kullanilabilecek", "giyebilecegim", "sikabilecegim",
        "uygun", "arasi", "yerine", "disinda", "haric", "ama", "fakat",
    };

    /// <summary>Kelime bir cümle işareti mi? Sınıflandırma dışında kullanılmaz.</summary>
    public static bool IsSentenceMarker(string word) => SentenceMarkers.Contains(word);

    /// <summary>Türkçe karakterleri veritabanındaki <c>unaccent</c> ile birebir aynı şekilde sadeleştirir.</summary>
    public static string Fold(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "";

        var lowered = input.ToLowerInvariant()
            .Replace('ı', 'i')
            .Replace('İ', 'i')
            .Replace('ş', 's')
            .Replace('ğ', 'g')
            .Replace('ç', 'c')
            .Replace('ö', 'o')
            .Replace('ü', 'u');

        var decomposed = lowered.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }

        return sb.ToString().Normalize(NormalizationForm.FormC).Trim();
    }

    public static SearchTerms Normalize(string? raw)
    {
        var input = raw?.Trim() ?? "";
        var folded = Fold(input);

        // "bvlgari'nin", "dior'un" gibi ekleri at.
        folded = string.Join(' ', folded
            .Split([' ', '\t', '\n', ','], StringSplitOptions.RemoveEmptyEntries)
            .Select(StripCaseSuffix)
            .Where(w => w.Length > 0));

        // Takma adları aç: önce tüm cümle, sonra tek tek kelimeler.
        if (Aliases.TryGetValue(folded, out var whole))
            folded = whole;
        else
            folded = string.Join(' ', folded.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(w => Aliases.TryGetValue(w, out var m) ? m : w));

        var tokens = folded
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 1 && !StopWords.Contains(w))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return new SearchTerms(input, folded, tokens);
    }
}
