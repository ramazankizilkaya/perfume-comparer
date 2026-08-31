using System.Text.Json.Serialization;

namespace PerfumeComparer.Business.Dtos;

/// <summary>
/// Doğal dildeki bir aramanın veritabanı diline çevrilmiş hâli.
/// Yapay zekâ bunu üretir; üretemezse yerel kelime tarayıcısı doldurur.
/// </summary>
public class AiSearchIntent
{
    /// <summary>"male", "female", "unisex" ya da null (fark etmez).</summary>
    [JsonPropertyName("gender")] public string? Gender { get; set; }

    /// <summary>"Spring", "Summer", "Autumn", "Winter".</summary>
    [JsonPropertyName("seasons")] public string[]? Seasons { get; set; }

    /// <summary>Veritabanındaki akor adları, örn. "Odunsu", "Vanilya".</summary>
    [JsonPropertyName("accords")] public string[]? Accords { get; set; }

    /// <summary>Veritabanındaki nota adları, örn. "Bergamot", "Sandal ağacı".</summary>
    [JsonPropertyName("notes")] public string[]? Notes { get; set; }

    /// <summary>Kullanıcının istemediği akorlar.</summary>
    [JsonPropertyName("avoidAccords")] public string[]? AvoidAccords { get; set; }

    /// <summary>Sorguda geçen marka adları.</summary>
    [JsonPropertyName("brands")] public string[]? Brands { get; set; }

    /// <summary>Koku ailesi: Woody, Floral, Oriental, Fresh, Citrus, Aromatic, Gourmand, Chypre, Fougere, Leather.</summary>
    [JsonPropertyName("families")] public string[]? Families { get; set; }

    /// <summary>"... benzeri" aramalarında referans alınan parfüm.</summary>
    [JsonPropertyName("referencePerfume")] public string? ReferencePerfume { get; set; }

    /// <summary>Muadil / klon / uygun fiyat araması mı?</summary>
    [JsonPropertyName("isCloneOrDupe")] public bool IsCloneOrDupe { get; set; }

    /// <summary>"day", "night" ya da null.</summary>
    [JsonPropertyName("dayNight")] public string? DayNight { get; set; }

    /// <summary>"niche" (az bilinen / niş), "popular" (herkesin bildiği) ya da null.</summary>
    [JsonPropertyName("popularity")] public string? Popularity { get; set; }

    /// <summary>Parfüm açıklamalarında aranacak serbest kelimeler.</summary>
    [JsonPropertyName("keywords")] public string[]? Keywords { get; set; }

    /// <summary>Kullanıcıya gösterilecek tek cümlelik Türkçe açıklama.</summary>
    [JsonPropertyName("summary")] public string? Summary { get; set; }

    /// <summary>Hiçbir sinyal yakalanmadıysa bu niyetle arama yapmanın anlamı yok.</summary>
    [JsonIgnore]
    public bool HasSignal =>
        Gender is not null
        || Seasons is { Length: > 0 }
        || Accords is { Length: > 0 }
        || Notes is { Length: > 0 }
        || Brands is { Length: > 0 }
        || Families is { Length: > 0 }
        || !string.IsNullOrWhiteSpace(ReferencePerfume)
        || Keywords is { Length: > 0 }
        || DayNight is not null
        || Popularity is not null;
}
