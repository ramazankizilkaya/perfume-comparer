using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Business.Ai;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain.Entities;
using PerfumeComparer.Domain;

namespace PerfumeComparer.Business.Services;

public class CompareAiService(
    AppDbContext db,
    IAiClient ai,
    ILogger<CompareAiService> logger) : ICompareAiService
{
    public async Task<string?> GetCachedComparisonAnalysisAsync(string p1Slug, string p2Slug, CancellationToken ct = default)
    {
        var ids = await db.Perfumes
            .AsNoTracking()
            .Where(p => p.Slug == p1Slug || p.Slug == p2Slug)
            .Select(p => p.Id)
            .ToListAsync(ct);

        if (ids.Count < 2)
            return null;

        var (firstId, secondId) = ComparisonComment.NormalizePair(ids[0], ids[1]);
        return await FindCachedAsync(firstId, secondId, ct);
    }

    private async Task<string?> FindCachedAsync(int firstId, int secondId, CancellationToken ct)
    {
        var cached = await db.ComparisonComments
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Perfume1Id == firstId && c.Perfume2Id == secondId
                                      && c.IsAiSummary && c.AiKind == ComparisonAiKind.Analysis, ct);

        return string.IsNullOrWhiteSpace(cached?.Body) ? null : cached.Body;
    }

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
        var cached = await FindCachedAsync(firstId, secondId, ct);
        if (cached is not null)
            return cached;

        // 2. Yoksa merkezi AI router'ı ile üret (ücretsizler önce, yetişmezse DeepSeek)
        if (!ai.Enabled)
            return null;

        var analysis = await ai.GenerateTextAsync(BuildPrompt(p1, p2), ct);
        if (string.IsNullOrWhiteSpace(analysis))
            return null;

        // 3. Veritabanına kaydet (ilerideki istekler doğrudan DB'den gelsin)
        var newSummary = new ComparisonComment
        {
            Perfume1Id = firstId,
            Perfume2Id = secondId,
            Body = analysis.Trim(),
            IsAiSummary = true,
            AiKind = ComparisonAiKind.Analysis,
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
            var fallbackCached = await FindCachedAsync(firstId, secondId, ct);
            if (fallbackCached is not null)
                return fallbackCached;
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
            Sen iki parfüm arasında seçim yapmaya çalışan kullanıcılara samimi, nokta atışı ve gerçekçi tavsiyeler veren tarafsız bir koku ve stil danışmanısın.

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
}
