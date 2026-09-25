using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain.Entities;
using PerfumeComparer.Domain;

namespace PerfumeComparer.Business.Services;

public class CompareAiService(
    AppDbContext db,
    IConfiguration configuration,
    IGeminiClient gemini,
    ILogger<CompareAiService> logger) : ICompareAiService
{
    private static readonly HttpClient HttpClient = new() { Timeout = TimeSpan.FromSeconds(25) };

    public async Task<string?> GetOrGenerateComparisonAnalysisAsync(string p1Slug, string p2Slug, CancellationToken ct = default)
    {
        var perfumes = await db.Perfumes
            .AsNoTracking()
            .Include(p => p.Brand)
            .Include(p => p.Accords).ThenInclude(pa => pa.Accord)
            .Include(p => p.Notes).ThenInclude(pn => pn.Note)
            .Where(p => p.Slug == p1Slug || p.Slug == p2Slug)
            .ToListAsync(ct);

        if (perfumes.Count < 2)
            return null;

        var p1 = perfumes.FirstOrDefault(p => p.Slug == p1Slug);
        var p2 = perfumes.FirstOrDefault(p => p.Slug == p2Slug);
        if (p1 is null || p2 is null)
            return null;

        var (firstId, secondId) = ComparisonComment.NormalizePair(p1.Id, p2.Id);

        // 1. Önbellekte (veritabanında) var mı kontrol et
        var cached = await db.ComparisonComments
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Perfume1Id == firstId && c.Perfume2Id == secondId && c.IsAiSummary, ct);

        if (cached is not null && !string.IsNullOrWhiteSpace(cached.Body))
        {
            return cached.Body;
        }

        // 2. Yoksa AI ile üret
        var prompt = BuildPrompt(p1, p2);
        string? analysis = await CallOpenAiAsync(prompt, ct);

        if (string.IsNullOrWhiteSpace(analysis) && gemini.Enabled)
        {
            logger.LogInformation("OpenAI yanıt dönmedi, Gemini'ye başvuruluyor ({P1} vs {P2}).", p1.Name, p2.Name);
            analysis = await CallGeminiFallbackAsync(prompt, ct);
        }

        if (string.IsNullOrWhiteSpace(analysis))
            return null;

        // 3. Veritabanına kaydet (ilerideki istekler doğrudan DB'den gelsin)
        var newSummary = new ComparisonComment
        {
            Perfume1Id = firstId,
            Perfume2Id = secondId,
            Body = analysis.Trim(),
            IsAiSummary = true,
            Status = ModerationStatus.Approved,
            CreatedAt = DateTimeOffset.UtcNow
        };

        try
        {
            db.ComparisonComments.Add(newSummary);
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            logger.LogWarning(ex, "AI karşılaştırma özeti kaydedilirken yarış durumu oluştu; mevcut kayıt kullanılacak.");
            var fallbackCached = await db.ComparisonComments
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Perfume1Id == firstId && c.Perfume2Id == secondId && c.IsAiSummary, ct);
            if (fallbackCached is not null)
                return fallbackCached.Body;
        }

        return newSummary.Body;
    }

    private static string BuildPrompt(Perfume p1, Perfume p2)
    {
        var p1Accords = string.Join(", ", p1.Accords.OrderByDescending(a => a.Width).Take(5).Select(a => a.Accord.Name));
        var p1Notes = string.Join(", ", p1.Notes.Take(8).Select(n => n.Note.Name));

        var p2Accords = string.Join(", ", p2.Accords.OrderByDescending(a => a.Width).Take(5).Select(a => a.Accord.Name));
        var p2Notes = string.Join(", ", p2.Notes.Take(8).Select(n => n.Note.Name));

        return $"""
            İki parfüm arasında kararsız kalmış ve seçim yapmak isteyen bir kullanıcı için doğrudan tavsiye niteliğinde, canlı ve akıcı bir karşılaştırma paragrafı yaz.
            Tablodaki teknik notaları tek tek sayma; kullanıcının aradığı hisse, ortama, yayılıma ve karaktere odaklan.

            Karşılaştırılacak Parfümler:
            1. {p1.Brand.Name} {p1.Name} (Akorlar: {p1Accords} | Notalar: {p1Notes})
            2. {p2.Brand.Name} {p2.Name} (Akorlar: {p2Accords} | Notalar: {p2Notes})

            Yazım Formatı (Bu şablonu takip et):
            {p1.Brand.Name} {p1.Name} [kokunun yayılımı, aurası ve hissettirdiği karakteri anlatan canlı bir tanım] iken; {p2.Brand.Name} {p2.Name} [diğer kokunun dengesi, havası ve tarzını anlatan canlı bir tanım] bir parfümdür. Eğer [aranan etki, ortam veya beklenti] istiyorsanız {p1.Brand.Name} {p1.Name}'i; [farklı bir tarz, ortam veya beklenti] arıyorsanız {p2.Brand.Name} {p2.Name}'i seçebilirsiniz.

            Kurallar:
            - Tamamen Türkçe yaz.
            - Başlık, madde işareti veya liste formatı KULLANMA. Tek veya en fazla iki akıcı paragraf olsun.
            - Robotik veya reklam dilinden kaçın; seçim aşamasındaki birine gerçekçi, zevkli ve nokta atışı bir stil rehberi gibi seslen.
            - Yaklaşık 70 - 130 kelime arasında tut.
            """;
    }

    private async Task<string?> CallOpenAiAsync(string prompt, CancellationToken ct)
    {
        var apiKey = configuration["OpenAI:ApiKey"] ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
            return null;

        var requestBody = new
        {
            model = "gpt-4o-mini",
            messages = new object[]
            {
                new { role = "system", content = "Sen iki parfüm arasında seçim yapmaya çalışan kullanıcılara samimi, nokta atışı ve gerçekçi tavsiyeler veren tarafsız bir koku ve stil danışmanısın." },
                new { role = "user", content = prompt }
            },
            max_tokens = 350,
            temperature = 0.7
        };

        var json = JsonSerializer.Serialize(requestBody);
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());

        try
        {
            using var response = await HttpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                logger.LogWarning("OpenAI isteği başarısız oldu ({StatusCode}): {Error}", response.StatusCode, err);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return content;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "OpenAI servisine bağlanırken hata oluştu.");
            return null;
        }
    }

    private sealed class GeminiFallbackResult
    {
        public string? Content { get; set; }
    }

    private async Task<string?> CallGeminiFallbackAsync(string prompt, CancellationToken ct)
    {
        try
        {
            var wrappedPrompt = prompt + "\n\nYalnızca şu formatta JSON döndür: {\"content\": \"...\"}";
            var res = await gemini.GenerateJsonAsync<GeminiFallbackResult>(wrappedPrompt, ct);
            return res?.Content;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Gemini fallback yanıtı alınamadı.");
            return null;
        }
    }
}
