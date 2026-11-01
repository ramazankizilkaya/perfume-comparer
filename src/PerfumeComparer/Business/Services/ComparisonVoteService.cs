using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

public class ComparisonVoteService(AppDbContext db) : IComparisonVoteService
{
    /// <summary>İstekteki iki slug'ın parfüm id'leri (istek sırasıyla).</summary>
    private sealed record Pair(int Id1, int Id2)
    {
        public (int First, int Second) Normalized => ComparisonComment.NormalizePair(Id1, Id2);
    }

    public async Task<ComparisonVoteSummaryDto?> GetAsync(
        string slug1, string slug2, string? voterKey, CancellationToken ct = default)
    {
        var pair = await ResolveAsync(slug1, slug2, ct);
        return pair is null ? null : await SummarizeAsync(pair, slug1, slug2, voterKey, ct);
    }

    public async Task<ComparisonVoteSummaryDto?> CastAsync(
        string slug1, string slug2, string voterKey, string? preferredSlug, CancellationToken ct = default)
    {
        var pair = await ResolveAsync(slug1, slug2, ct);
        if (pair is null)
            return null;

        int? preferredId = null;
        if (!string.IsNullOrWhiteSpace(preferredSlug))
        {
            preferredId = preferredSlug == slug1 ? pair.Id1
                : preferredSlug == slug2 ? pair.Id2
                : throw new ArgumentException("Tercih bu karşılaştırmadaki parfümlerden biri olmalıdır.", nameof(preferredSlug));
        }

        var (first, second) = pair.Normalized;
        var existing = await FindVoteAsync(first, second, voterKey, ct);

        if (preferredId is null)
        {
            if (existing is not null)
            {
                db.ComparisonVotes.Remove(existing);
                await db.SaveChangesAsync(ct);
            }
        }
        else if (existing is null)
        {
            db.ComparisonVotes.Add(new ComparisonVote
            {
                FirstPerfumeId = first,
                SecondPerfumeId = second,
                PreferredPerfumeId = preferredId.Value,
                VoterKey = voterKey,
                CreatedAt = DateTimeOffset.UtcNow,
            });

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                // Aynı seçmenin iki isteği aynı anda geldi; öbürü kaydı açtı, bu istek onu günceller.
                db.ChangeTracker.Clear();
                await UpdateVoteAsync(first, second, voterKey, preferredId.Value, ct);
            }
        }
        else
        {
            await UpdateVoteAsync(existing, preferredId.Value, ct);
        }

        return await SummarizeAsync(pair, slug1, slug2, voterKey, ct);
    }

    private Task<ComparisonVote?> FindVoteAsync(int first, int second, string voterKey, CancellationToken ct) =>
        db.ComparisonVotes.FirstOrDefaultAsync(
            v => v.FirstPerfumeId == first && v.SecondPerfumeId == second && v.VoterKey == voterKey, ct);

    private async Task UpdateVoteAsync(int first, int second, string voterKey, int preferredId, CancellationToken ct)
    {
        var vote = await FindVoteAsync(first, second, voterKey, ct);
        if (vote is not null)
            await UpdateVoteAsync(vote, preferredId, ct);
    }

    private async Task UpdateVoteAsync(ComparisonVote vote, int preferredId, CancellationToken ct)
    {
        if (vote.PreferredPerfumeId == preferredId)
            return;

        vote.PreferredPerfumeId = preferredId;
        vote.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private async Task<Pair?> ResolveAsync(string slug1, string slug2, CancellationToken ct)
    {
        if (slug1 == slug2)
            return null;

        var ids = await db.Perfumes
            .AsNoTracking()
            .Where(p => p.Slug == slug1 || p.Slug == slug2)
            .Select(p => new { p.Id, p.Slug })
            .ToListAsync(ct);

        var id1 = ids.FirstOrDefault(x => x.Slug == slug1)?.Id;
        var id2 = ids.FirstOrDefault(x => x.Slug == slug2)?.Id;

        return id1 is null || id2 is null ? null : new Pair(id1.Value, id2.Value);
    }

    private async Task<ComparisonVoteSummaryDto> SummarizeAsync(
        Pair pair, string slug1, string slug2, string? voterKey, CancellationToken ct)
    {
        var (first, second) = pair.Normalized;

        var counts = await db.ComparisonVotes
            .AsNoTracking()
            .Where(v => v.FirstPerfumeId == first && v.SecondPerfumeId == second)
            .GroupBy(v => v.PreferredPerfumeId)
            .Select(g => new { PerfumeId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var votes1 = counts.FirstOrDefault(c => c.PerfumeId == pair.Id1)?.Count ?? 0;
        var votes2 = counts.FirstOrDefault(c => c.PerfumeId == pair.Id2)?.Count ?? 0;
        var total = votes1 + votes2;

        // İkinci yüzde birinciden türetilir; yuvarlama yüzünden toplam 101 olmasın.
        var percent1 = total == 0 ? 0 : (int)Math.Round(100.0 * votes1 / total, MidpointRounding.AwayFromZero);
        var percent2 = total == 0 ? 0 : 100 - percent1;

        string? myVote = null;
        if (voterKey is not null)
        {
            var mine = await db.ComparisonVotes
                .AsNoTracking()
                .Where(v => v.FirstPerfumeId == first && v.SecondPerfumeId == second && v.VoterKey == voterKey)
                .Select(v => (int?)v.PreferredPerfumeId)
                .FirstOrDefaultAsync(ct);

            myVote = mine == pair.Id1 ? slug1 : mine == pair.Id2 ? slug2 : null;
        }

        return new ComparisonVoteSummaryDto(
            total,
            myVote,
            new List<ComparisonVoteOptionDto>
            {
                new(slug1, votes1, percent1),
                new(slug2, votes2, percent2),
            });
    }
}
