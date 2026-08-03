using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

public class UsageService(AppDbContext db) : IUsageService
{
    public async Task<PerfumeUsageResultDto?> RecordAsync(
        string slug, string ageGroupSlug, int? userId, CancellationToken ct = default)
    {
        if (Lookups.AgeGroupFromSlug(ageGroupSlug) is not { } ageGroup)
            throw new ArgumentException("Geçersiz yaş grubu.", nameof(ageGroupSlug));

        var perfume = await db.Perfumes
            .Include(p => p.AgeGroups)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);

        if (perfume is null)
            return null;

        // Girişli kullanıcı fikrini değiştirebilir; sayaç şişmesin diye kaydı güncelliyoruz.
        var existing = userId is null
            ? null
            : await db.PerfumeUsages.FirstOrDefaultAsync(u => u.PerfumeId == perfume.Id && u.UserId == userId, ct);

        if (existing is null)
        {
            db.PerfumeUsages.Add(new PerfumeUsage
            {
                PerfumeId = perfume.Id,
                UserId = userId,
                AgeGroup = ageGroup,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            existing.AgeGroup = ageGroup;
        }

        await db.SaveChangesAsync(ct);

        // Özet sayaçları kayıtlardan yeniden hesapla: tek doğru kaynak usage tablosu.
        var counts = await db.PerfumeUsages
            .Where(u => u.PerfumeId == perfume.Id)
            .GroupBy(u => u.AgeGroup)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);

        foreach (var group in Enum.GetValues<AgeGroup>())
        {
            var votes = counts.FirstOrDefault(c => c.Key == group)?.Count ?? 0;
            var row = perfume.AgeGroups.FirstOrDefault(a => a.AgeGroup == group);

            if (row is null)
            {
                if (votes == 0) continue;
                perfume.AgeGroups.Add(new PerfumeAgeGroup { AgeGroup = group, Votes = votes });
            }
            else
            {
                row.Votes = votes;
            }
        }

        perfume.UsageCount = counts.Sum(c => c.Count);
        await db.SaveChangesAsync(ct);

        var total = perfume.UsageCount;
        return new PerfumeUsageResultDto(
            total,
            Enum.GetValues<AgeGroup>()
                .Select(a =>
                {
                    var votes = perfume.AgeGroups.FirstOrDefault(x => x.AgeGroup == a)?.Votes ?? 0;
                    var percent = total <= 0 ? (short)0 : (short)Math.Round(votes * 100.0 / total);
                    return new ScoredRefDto(a.Label(), a.Slug(), percent, votes);
                })
                .ToList());
    }
}
