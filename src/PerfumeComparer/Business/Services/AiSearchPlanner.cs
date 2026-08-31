using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

public interface IAiSearchPlanner
{
    /// <summary>Yapay zekâ gerçekten çalışabiliyor mu?</summary>
    bool Enabled { get; }

    /// <summary>Doğal dildeki sorguyu veritabanı filtrelerine çevirir; başarısız olursa null döner.</summary>
    Task<AiSearchIntent?> PlanAsync(string query, CancellationToken ct = default);

    /// <summary>Yapay zekâ yoksa ya da cevap veremezse kullanılan yerel kelime tarayıcısı.</summary>
    AiSearchIntent PlanLocally(SearchTerms terms);
}

/// <summary>
/// Sorguyu Gemini'ye gönderirken veritabanındaki gerçek akor ve koku ailesi
/// listesini de verir; böylece model uydurma değil, sorgulanabilir değerler döner.
/// </summary>
public class AiSearchPlanner(IUnitOfWork uow, IGeminiClient gemini, IMemoryCache cache, ILogger<AiSearchPlanner> logger)
    : IAiSearchPlanner
{
    private const string VocabularyCacheKey = "ai-search:accord-vocabulary";

    public bool Enabled => gemini.Enabled;

    public async Task<AiSearchIntent?> PlanAsync(string query, CancellationToken ct = default)
    {
        if (!gemini.Enabled || string.IsNullOrWhiteSpace(query)) return null;

        // Aynı sorgu için modele tekrar tekrar gitmeye gerek yok.
        var cacheKey = $"ai-search:intent:{SearchTextNormalizer.Fold(query)}";
        if (cache.TryGetValue<AiSearchIntent>(cacheKey, out var cachedIntent) && cachedIntent is not null)
            return cachedIntent;

        var accords = await GetAccordVocabularyAsync(ct);
        var prompt = BuildPrompt(query, accords);

        var intent = await gemini.GenerateJsonAsync<AiSearchIntent>(prompt, ct);
        if (intent is null)
        {
            logger.LogInformation("Yapay zekâ sorgu çözümlemesi boş döndü: {Query}", query);
            return null;
        }

        cache.Set(cacheKey, intent, TimeSpan.FromHours(2));
        return intent;
    }

    private async Task<string> GetAccordVocabularyAsync(CancellationToken ct)
    {
        if (cache.TryGetValue<string>(VocabularyCacheKey, out var cached) && cached is not null)
            return cached;

        var names = await uow.GetRepository<Accord>().AsNoTracking()
            .OrderByDescending(a => a.PerfumeCount)
            .Select(a => a.Name)
            .Take(90)
            .ToListAsync(ct);

        var joined = string.Join(", ", names);
        cache.Set(VocabularyCacheKey, joined, TimeSpan.FromHours(6));
        return joined;
    }

    private static string BuildPrompt(string query, string accordVocabulary) => $$"""
        Sen bir Türk parfüm veri tabanının sorgu çözümleyicisisin. Kullanıcının doğal
        dille yazdığı aramayı, veri tabanında sorgulanabilir filtrelere çevir.

        Kullanıcı sorgusu: "{{query}}"

        Kurallar:
        - Yalnızca geçerli JSON döndür, başka hiçbir metin yazma.
        - "accords" ve "avoidAccords" alanlarında SADECE şu listedeki adları kullan
          (birebir aynı yaz, listede olmayanı yazma): {{accordVocabulary}}
        - "notes" alanına Türkçe nota adları yaz (ör. "Bergamot", "Sandal ağacı",
          "Tonka fasulyesi"). Emin değilsen boş bırak.
        - "families" için sadece şunlar geçerli: Woody, Floral, Oriental, Fresh,
          Citrus, Aromatic, Gourmand, Chypre, Fougere, Leather.
        - "gender" için sadece "male", "female", "unisex" ya da null.
        - "seasons" için sadece "Spring", "Summer", "Autumn", "Winter".
        - "dayNight" için "day" (gündüz/ofis/günlük) veya "night" (gece/davet) ya da null.
        - "popularity" için: kullanıcı az bilinen / niş / keşfedilmemiş bir koku
          istiyorsa "niche", herkesin bildiği popüler bir koku istiyorsa "popular",
          belirtmemişse null.
        - "referencePerfume" yalnızca kullanıcı belirli bir parfüme benzeyeni istiyorsa
          doldurulur ve sadece parfümün adı yazılır (ör. "Dior Sauvage"), ek kelime yazma.
        - "isCloneOrDupe" kullanıcı muadil, klon, dupe ya da ucuz alternatif istiyorsa true.
        - "keywords" alanına, parfüm açıklamalarında geçebilecek 0-5 Türkçe sıfat yaz
          (ör. "ferah", "gece", "davetkar"). Marka veya parfüm adı yazma.
        - "summary" alanına sonucun neden bu şekilde seçildiğini anlatan tek bir
          kısa Türkçe cümle yaz.

        JSON şeması:
        {
          "gender": null,
          "seasons": [],
          "accords": [],
          "notes": [],
          "avoidAccords": [],
          "brands": [],
          "families": [],
          "referencePerfume": null,
          "isCloneOrDupe": false,
          "dayNight": null,
          "popularity": null,
          "keywords": [],
          "summary": ""
        }
        """;

    // ------------------------------------------------------------- yerel yedek

    private static readonly (string Word, string Gender)[] GenderWords =
    [
        ("erkek", "male"), ("bay", "male"), ("maskulen", "male"),
        ("kadin", "female"), ("bayan", "female"), ("feminen", "female"),
        ("unisex", "unisex"),
    ];

    private static readonly (string Word, string Season)[] SeasonWords =
    [
        ("yaz", "Summer"), ("yazlik", "Summer"),
        ("kis", "Winter"), ("kislik", "Winter"),
        ("ilkbahar", "Spring"), ("bahar", "Spring"),
        ("sonbahar", "Autumn"), ("guz", "Autumn"),
    ];

    private static readonly string[] PopularityWords =
    [
        "az", "nis", "bilinen", "bilinmeyen", "kesfedilmemis", "gizli",
        "siradisi", "populer", "unlu", "herkesin", "farkli",
    ];

    private static readonly string[] SimilarityWords =
    [
        "benzeyen", "benzer", "benzeri", "benzerleri", "muadil", "muadili", "muadilleri",
        "klon", "klonu", "klonlari", "dupe", "tarzinda", "gibi",
    ];

    public AiSearchIntent PlanLocally(SearchTerms terms)
    {
        var tokens = terms.Tokens;

        var intent = new AiSearchIntent
        {
            Gender = GenderWords.FirstOrDefault(g => tokens.Contains(g.Word)).Gender,
            Seasons = SeasonWords.Where(s => tokens.Contains(s.Word)).Select(s => s.Season).Distinct().ToArray(),
            IsCloneOrDupe = tokens.Any(t => t is "muadil" or "muadili" or "muadilleri" or "klon" or "klonu" or "dupe" or "ucuz"),
            DayNight = tokens.Any(t => t is "gece" or "davet" or "gecelik") ? "night"
                : tokens.Any(t => t is "gunduz" or "ofis" or "gunluk" or "is") ? "day"
                : null,
            Popularity = tokens.Any(t => t is "nis" or "bilinen" or "bilinmeyen" or "kesfedilmemis" or "gizli" or "siradisi") ? "niche"
                : tokens.Any(t => t is "populer" or "unlu" or "herkesin" or "bilinen") ? "popular"
                : null,
        };

        // "sauvage benzeri" -> referans parfüm "sauvage"
        var similarityIndex = Array.FindIndex(tokens, t => SimilarityWords.Contains(t));
        if (similarityIndex > 0)
            intent.ReferencePerfume = string.Join(' ', tokens.Take(similarityIndex));

        // Geri kalan kelimeler akor/nota eşleşmesi için aday olarak kullanılır.
        var noise = new HashSet<string>(SimilarityWords, StringComparer.Ordinal);
        foreach (var w in PopularityWords) noise.Add(w);
        foreach (var g in GenderWords) noise.Add(g.Word);
        foreach (var s in SeasonWords) noise.Add(s.Word);

        intent.Keywords = tokens.Where(t => !noise.Contains(t) && t.Length > 2).ToArray();
        intent.Accords = intent.Keywords;
        intent.Notes = intent.Keywords;

        return intent;
    }
}
