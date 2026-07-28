using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Belirli aralıklarla çalışıp yeterli yorum biriken parfümler ve
/// karşılaştırmalar için AI özeti üretir. Özet ayrı bir tabloda değil,
/// ilgili yorum tablosunda <c>is_ai_summary</c> bayrağıyla durur:
/// yoksa eklenir, varsa (yeni yorum geldiyse) güncellenir.
/// </summary>
public class AiSummaryJob(
    IServiceProvider services,
    IAiSummaryClient ai,
    IConfiguration configuration,
    ILogger<AiSummaryJob> logger) : BackgroundService
{
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(
        configuration.GetValue<double?>("Ai:IntervalMinutes") ?? 30);

    private readonly int _minComments = configuration.GetValue<int?>("Ai:MinComments") ?? 3;

    private readonly TimeSpan _startupDelay = TimeSpan.FromSeconds(
        configuration.GetValue<double?>("Ai:StartupDelaySeconds") ?? 20);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!ai.IsEnabled)
        {
            logger.LogInformation(
                "AI özet işi kapalı: Ai:ApiKey veya ANTHROPIC_API_KEY tanımlı değil.");
            return;
        }

        try
        {
            await Task.Delay(_startupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "AI özet işi başarısız oldu");
            }

            try
            {
                await Task.Delay(_interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    /// <summary>Bir tur: önce parfüm özetleri, sonra karşılaştırma özetleri.</summary>
    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var perfumeCount = await SummarizePerfumesAsync(db, ct);
        var comparisonCount = await SummarizeComparisonsAsync(db, ct);

        if (perfumeCount + comparisonCount > 0)
            logger.LogInformation(
                "AI özetleri güncellendi: {Perfumes} parfüm, {Comparisons} karşılaştırma",
                perfumeCount, comparisonCount);
    }

    private async Task<int> SummarizePerfumesAsync(AppDbContext db, CancellationToken ct)
    {
        // Kullanıcı yorumu sayısı eşiği geçen parfümler
        var candidates = await db.PerfumeComments
            .AsNoTracking()
            .Where(c => !c.IsAiSummary && c.Status == ModerationStatus.Approved)
            .GroupBy(c => c.PerfumeId)
            .Select(g => new { PerfumeId = g.Key, Count = g.Count() })
            .Where(x => x.Count >= _minComments)
            .ToListAsync(ct);

        var updated = 0;

        foreach (var candidate in candidates)
        {
            ct.ThrowIfCancellationRequested();

            var existing = await db.PerfumeComments
                .FirstOrDefaultAsync(c => c.PerfumeId == candidate.PerfumeId && c.IsAiSummary, ct);

            // Özet güncelse yeniden üretme
            if (existing is not null && existing.SourceCommentCount == candidate.Count)
                continue;

            var perfume = await db.Perfumes
                .AsNoTracking()
                .Include(p => p.Brand)
                .FirstOrDefaultAsync(p => p.Id == candidate.PerfumeId, ct);

            if (perfume is null)
                continue;

            var bodies = await db.PerfumeComments
                .AsNoTracking()
                .Where(c => c.PerfumeId == candidate.PerfumeId && !c.IsAiSummary
                            && c.Status == ModerationStatus.Approved)
                .OrderByDescending(c => c.CreatedAt)
                .Take(50)
                .Select(c => c.Body)
                .ToListAsync(ct);

            var summary = await ai.SummarizePerfumeAsync(perfume.Name, perfume.Brand.Name, bodies, ct);
            if (string.IsNullOrWhiteSpace(summary))
                continue;

            if (existing is null)
            {
                db.PerfumeComments.Add(new PerfumeComment
                {
                    PerfumeId = perfume.Id,
                    Body = summary,
                    IsAiSummary = true,
                    SourceCommentCount = candidate.Count,
                    Status = ModerationStatus.Approved,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                });
            }
            else
            {
                existing.Body = summary;
                existing.SourceCommentCount = candidate.Count;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await db.SaveChangesAsync(ct);
            updated++;
        }

        return updated;
    }

    private async Task<int> SummarizeComparisonsAsync(AppDbContext db, CancellationToken ct)
    {
        var candidates = await db.ComparisonComments
            .AsNoTracking()
            .Where(c => !c.IsAiSummary && c.Status == ModerationStatus.Approved)
            .GroupBy(c => new { c.Perfume1Id, c.Perfume2Id })
            .Select(g => new { g.Key.Perfume1Id, g.Key.Perfume2Id, Count = g.Count() })
            .Where(x => x.Count >= _minComments)
            .ToListAsync(ct);

        var updated = 0;

        foreach (var candidate in candidates)
        {
            ct.ThrowIfCancellationRequested();

            var existing = await db.ComparisonComments
                .FirstOrDefaultAsync(c => c.Perfume1Id == candidate.Perfume1Id
                                          && c.Perfume2Id == candidate.Perfume2Id
                                          && c.IsAiSummary, ct);

            if (existing is not null && existing.SourceCommentCount == candidate.Count)
                continue;

            var names = await db.Perfumes
                .AsNoTracking()
                .Where(p => p.Id == candidate.Perfume1Id || p.Id == candidate.Perfume2Id)
                .Select(p => new { p.Id, Label = p.Brand.Name + " " + p.Name })
                .ToListAsync(ct);

            var name1 = names.FirstOrDefault(n => n.Id == candidate.Perfume1Id)?.Label;
            var name2 = names.FirstOrDefault(n => n.Id == candidate.Perfume2Id)?.Label;
            if (name1 is null || name2 is null)
                continue;

            var bodies = await db.ComparisonComments
                .AsNoTracking()
                .Where(c => c.Perfume1Id == candidate.Perfume1Id && c.Perfume2Id == candidate.Perfume2Id
                            && !c.IsAiSummary && c.Status == ModerationStatus.Approved)
                .OrderByDescending(c => c.CreatedAt)
                .Take(50)
                .Select(c => c.Body)
                .ToListAsync(ct);

            var summary = await ai.SummarizeComparisonAsync(name1, name2, bodies, ct);
            if (string.IsNullOrWhiteSpace(summary))
                continue;

            if (existing is null)
            {
                db.ComparisonComments.Add(new ComparisonComment
                {
                    Perfume1Id = candidate.Perfume1Id,
                    Perfume2Id = candidate.Perfume2Id,
                    Body = summary,
                    IsAiSummary = true,
                    SourceCommentCount = candidate.Count,
                    Status = ModerationStatus.Approved,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                });
            }
            else
            {
                existing.Body = summary;
                existing.SourceCommentCount = candidate.Count;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await db.SaveChangesAsync(ct);
            updated++;
        }

        return updated;
    }
}
