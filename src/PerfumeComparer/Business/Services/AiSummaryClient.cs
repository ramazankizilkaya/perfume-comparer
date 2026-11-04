using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Yorum özetlerini ücretsiz Gemini API'si üzerinden üretir. Anthropic anahtarı
/// tanımlı değilse <see cref="IAiSummaryClient"/> olarak bu istemci devreye girer,
/// böylece özet üretimi ücretli bir anahtara bağlı kalmaz.
/// </summary>
public class GeminiSummaryClient(IGeminiClient gemini, ILogger<GeminiSummaryClient> logger) : IAiSummaryClient
{
    /// <summary>Gemini'den dönen JSON gövdesi.</summary>
    private sealed class SummaryResponse
    {
        public string? Summary { get; set; }
    }

    /// <summary>İstenen çıktı şeması. Ham metin interpolasyonunda süslü parantez
    /// kaçışı olmadığı için ayrı sabit olarak tutuluyor.</summary>
    private const string JsonShape = """{"summary": "..."}""";

    private const string Rules = """
        Kurallar:
        - Türkçe yaz, 2-4 cümle, en fazla 400 karakter.
        - Sadece verilen yorumlardaki bilgileri kullan; yeni özellik uydurma.
        - Görüşler çelişiyorsa ikisini de belirt ("kimi kullanıcılar ... derken").
        - Reklam dili, ünlem, madde işareti, markdown ve başlık kullanma; düz metin yaz.
        - "Kullanıcılar" diye üçüncü şahıs anlat; kendinden bahsetme.
        """;

    public bool IsEnabled => gemini.Enabled;

    public Task<string?> SummarizePerfumeAsync(
        string perfumeName, string brandName, IReadOnlyList<string> comments, CancellationToken ct = default)
    {
        var prompt = $"""
            Sen bir Türk parfüm bilgi portalının editörüsün. Aşağıda {brandName} markasının
            "{perfumeName}" parfümü hakkında kullanıcıların yazdığı yorumlar var. Bu yorumları
            tek bir tarafsız özete dönüştür. Kalıcılık, yayılım ve genel izlenim öne çıkıyorsa
            bunlara değin.

            {Rules}

            Yorumlar:
            {Join(comments)}

            Yalnızca şu JSON'u döndür: {JsonShape}
            """;

        return GenerateAsync(prompt, ct);
    }

    public Task<string?> SummarizeComparisonAsync(
        string perfume1, string perfume2, IReadOnlyList<string> comments, CancellationToken ct = default)
    {
        var prompt = $"""
            Sen bir Türk parfüm bilgi portalının editörüsün. Aşağıda "{perfume1}" ile "{perfume2}"
            karşılaştırması hakkında kullanıcıların yazdığı yorumlar var. Bu yorumları tek bir
            tarafsız özete dönüştür. İki koku arasındaki farklara odaklan: hangisi hangi durumda
            öne çıkıyor, kalıcılık ve yayılım olarak nerede ayrışıyorlar.

            {Rules}

            Yorumlar:
            {Join(comments)}

            Yalnızca şu JSON'u döndür: {JsonShape}
            """;

        return GenerateAsync(prompt, ct);
    }

    private async Task<string?> GenerateAsync(string prompt, CancellationToken ct)
    {
        if (!gemini.Enabled) return null;

        try
        {
            var result = await gemini.GenerateJsonAsync<SummaryResponse>(prompt, ct);
            var summary = result?.Summary?.Trim();
            return string.IsNullOrWhiteSpace(summary) ? null : summary;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Gemini özeti üretilemedi");
            return null;
        }
    }

    /// <summary>Yorumları numaralı satırlara çevirir; çok uzun gövdeler kırpılır.</summary>
    private static string Join(IReadOnlyList<string> comments)
    {
        var sb = new StringBuilder();
        var i = 1;

        foreach (var body in comments.Where(c => !string.IsNullOrWhiteSpace(c)).Take(50))
        {
            var text = body.Trim();
            if (text.Length > 600) text = text[..600];
            sb.Append(i++).Append(". ").AppendLine(text);
        }

        return sb.ToString();
    }
}
