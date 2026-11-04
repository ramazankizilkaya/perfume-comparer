using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;

namespace PerfumeComparer.Business.Services;

public class AdminDashboardService(AppDbContext db) : IAdminDashboardService
{
    public const string PerfumeKind = "perfume";
    public const string ComparisonKind = "comparison";

    private const int TopListSize = 10;

    // Günler Türkiye saatine göre bölünür; aksi halde gece yarısından sonraki kayıtlar önceki güne düşer.
    private static readonly TimeZoneInfo Turkey = ResolveTurkeyZone();

    private sealed record PerfumeRef(string Name, string Brand, string Slug, string Path);

    public async Task<AdminAnalyticsDto> GetAnalyticsAsync(int days, CancellationToken ct = default)
    {
        days = Math.Clamp(days, 1, 365);
        var now = DateTimeOffset.UtcNow;
        var since = now.AddDays(-days);

        var summary = await BuildSummaryAsync(now, since, ct);
        var daily = await BuildDailyAsync(now, days, ct);

        // --- sıralı listeler: önce id + sayı, sonra parfüm bilgisi tek sorguda ---
        var topViewed = await db.PerfumeViews.AsNoTracking()
            .Where(v => v.ViewedAt >= since)
            .GroupBy(v => v.PerfumeId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(TopListSize)
            .ToListAsync(ct);

        var topViewedAllTime = await db.PerfumeViews.AsNoTracking()
            .GroupBy(v => v.PerfumeId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(TopListSize)
            .ToListAsync(ct);

        var mostCommented = await db.PerfumeComments.AsNoTracking()
            .Where(c => !c.IsAiSummary && c.CreatedAt >= since)
            .GroupBy(c => c.PerfumeId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(TopListSize)
            .ToListAsync(ct);

        var mostRecommended = await db.UserPerfumeRecommendations.AsNoTracking()
            .Where(r => r.CreatedAt >= since)
            .GroupBy(r => r.PerfumeId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(TopListSize)
            .ToListAsync(ct);

        var mostFavorited = await db.Favorites.AsNoTracking()
            .Where(f => f.CreatedAt >= since)
            .GroupBy(f => f.PerfumeId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(TopListSize)
            .ToListAsync(ct);

        var votePairs = await db.ComparisonVotes.AsNoTracking()
            .Where(v => (v.UpdatedAt ?? v.CreatedAt) >= since)
            .GroupBy(v => new { v.FirstPerfumeId, v.SecondPerfumeId })
            .Select(g => new { A = g.Key.FirstPerfumeId, B = g.Key.SecondPerfumeId, Count = g.Count() })
            .ToListAsync(ct);

        var commentPairs = await db.ComparisonComments.AsNoTracking()
            .Where(c => !c.IsAiSummary && c.CreatedAt >= since)
            .GroupBy(c => new { c.Perfume1Id, c.Perfume2Id })
            .Select(g => new { A = g.Key.Perfume1Id, B = g.Key.Perfume2Id, Count = g.Count() })
            .ToListAsync(ct);

        var pairs = votePairs.Select(v => (v.A, v.B))
            .Concat(commentPairs.Select(c => (c.A, c.B)))
            .Distinct()
            .Select(p => new
            {
                p.A,
                p.B,
                Votes = votePairs.Where(v => v.A == p.A && v.B == p.B).Sum(v => v.Count),
                Comments = commentPairs.Where(c => c.A == p.A && c.B == p.B).Sum(c => c.Count),
            })
            .OrderByDescending(p => p.Votes + p.Comments)
            .Take(TopListSize)
            .ToList();

        var ids = topViewed.Select(x => x.Id)
            .Concat(topViewedAllTime.Select(x => x.Id))
            .Concat(mostCommented.Select(x => x.Id))
            .Concat(mostRecommended.Select(x => x.Id))
            .Concat(mostFavorited.Select(x => x.Id))
            .Concat(pairs.SelectMany(p => new[] { p.A, p.B }))
            .ToHashSet();
        var refs = await LoadPerfumeRefsAsync(ids, ct);

        List<AdminRankDto> Rank(IEnumerable<(int Id, int Count)> rows) => rows
            .Where(r => refs.ContainsKey(r.Id))
            .Select(r => new AdminRankDto(refs[r.Id].Name, refs[r.Id].Brand, refs[r.Id].Path, r.Count))
            .ToList();

        var topComparisons = pairs
            .Where(p => refs.ContainsKey(p.A) && refs.ContainsKey(p.B))
            .Select(p => new AdminRankDto(
                $"{refs[p.A].Brand} {refs[p.A].Name} vs {refs[p.B].Brand} {refs[p.B].Name}",
                $"{p.Votes} oy, {p.Comments} yorum",
                $"{refs[p.A].Slug},{refs[p.B].Slug}",
                p.Votes + p.Comments))
            .ToList();

        var topBlogs = await db.BlogPosts.AsNoTracking()
            .Where(b => b.Status == BlogPostStatus.Published)
            .OrderByDescending(b => b.ViewCount).Take(TopListSize)
            .Select(b => new AdminRankDto(b.Title, b.Category, b.Slug, b.ViewCount))
            .ToListAsync(ct);

        var advisor = await BuildAdvisorInsightsAsync(since, ct);

        return new AdminAnalyticsDto(
            days,
            now,
            summary,
            daily,
            Rank(topViewed.Select(x => (x.Id, x.Count))),
            Rank(topViewedAllTime.Select(x => (x.Id, x.Count))),
            topBlogs,
            Rank(mostCommented.Select(x => (x.Id, x.Count))),
            Rank(mostRecommended.Select(x => (x.Id, x.Count))),
            Rank(mostFavorited.Select(x => (x.Id, x.Count))),
            topComparisons,
            advisor);
    }

    private async Task<AdminSummaryDto> BuildSummaryAsync(DateTimeOffset now, DateTimeOffset since, CancellationToken ct)
    {
        var views = db.PerfumeViews.AsNoTracking();
        Task<int> DistinctIps(DateTimeOffset from) =>
            views.Where(v => v.ViewedAt >= from).Select(v => v.IpAddress).Distinct().CountAsync(ct);

        // DbContext aynı anda tek sorgu çalıştırır; bu yüzden sayımlar sırayla beklenir.
        var visitors = new AdminVisitorsDto(
            await DistinctIps(now.AddDays(-1)),
            await DistinctIps(now.AddDays(-7)),
            await DistinctIps(now.AddDays(-30)),
            await views.Select(v => v.IpAddress).Distinct().CountAsync(ct),
            await views.CountAsync(ct));

        var users = new AdminCountDto(
            await db.Users.CountAsync(ct),
            await db.Users.CountAsync(u => u.CreatedAt >= since, ct));

        var perfumeComments = db.PerfumeComments.AsNoTracking().Where(c => !c.IsAiSummary);
        var comparisonComments = db.ComparisonComments.AsNoTracking().Where(c => !c.IsAiSummary);
        var recs = db.UserPerfumeRecommendations.AsNoTracking();

        var blogsByStatus = await db.BlogPosts.AsNoTracking()
            .GroupBy(b => b.Status)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return new AdminSummaryDto(
            visitors,
            users,
            new AdminCountDto(await perfumeComments.CountAsync(ct), await perfumeComments.CountAsync(c => c.CreatedAt >= since, ct)),
            new AdminCountDto(await comparisonComments.CountAsync(ct), await comparisonComments.CountAsync(c => c.CreatedAt >= since, ct)),
            new AdminCountDto(await recs.CountAsync(ct), await recs.CountAsync(r => r.CreatedAt >= since, ct)),
            await recs.Select(r => r.UserId).Distinct().CountAsync(ct),
            new AdminCountDto(await db.Ratings.CountAsync(ct), await db.Ratings.CountAsync(r => r.CreatedAt >= since, ct)),
            new AdminCountDto(await db.Favorites.CountAsync(ct), await db.Favorites.CountAsync(f => f.CreatedAt >= since, ct)),
            new AdminCountDto(await db.ComparisonVotes.CountAsync(ct), await db.ComparisonVotes.CountAsync(v => v.CreatedAt >= since, ct)),
            new AdminCountDto(await db.PerfumeUsages.CountAsync(ct), await db.PerfumeUsages.CountAsync(u => u.CreatedAt >= since, ct)),
            new AdminCountDto(await db.PerfumeUserPhotos.CountAsync(ct), await db.PerfumeUserPhotos.CountAsync(p => p.CreatedAt >= since, ct)),
            await db.BlogPosts.SumAsync(b => b.ViewCount, ct),
            await db.PerfumeComments.CountAsync(c => c.IsAiSummary, ct) + await db.ComparisonComments.CountAsync(c => c.IsAiSummary, ct),
            Enum.GetValues<BlogPostStatus>().ToDictionary(
                s => s.ToString(),
                s => blogsByStatus.FirstOrDefault(b => b.Key == s)?.Count ?? 0));
    }

    /// <summary>Son <paramref name="days"/> günün günlük sayıları; boş günler de sıfırla yer alır.</summary>
    private async Task<IReadOnlyList<AdminDailyDto>> BuildDailyAsync(DateTimeOffset now, int days, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, Turkey).DateTime);
        var firstDay = today.AddDays(-(days - 1));
        // Türkiye'de günün başlangıcından bir gün önceden çekip bellekte gün gün ayırıyoruz.
        var from = now.AddDays(-days - 1);

        var users = await db.Users.AsNoTracking().Where(u => u.CreatedAt >= from).Select(u => u.CreatedAt).ToListAsync(ct);
        var perfumeComments = await db.PerfumeComments.AsNoTracking().Where(c => !c.IsAiSummary && c.CreatedAt >= from).Select(c => c.CreatedAt).ToListAsync(ct);
        var comparisonComments = await db.ComparisonComments.AsNoTracking().Where(c => !c.IsAiSummary && c.CreatedAt >= from).Select(c => c.CreatedAt).ToListAsync(ct);
        var recs = await db.UserPerfumeRecommendations.AsNoTracking().Where(r => r.CreatedAt >= from).Select(r => r.CreatedAt).ToListAsync(ct);
        var ratings = await db.Ratings.AsNoTracking().Where(r => r.CreatedAt >= from).Select(r => r.CreatedAt).ToListAsync(ct);
        var votes = await db.ComparisonVotes.AsNoTracking().Where(v => v.CreatedAt >= from).Select(v => v.CreatedAt).ToListAsync(ct);
        var favorites = await db.Favorites.AsNoTracking().Where(f => f.CreatedAt >= from).Select(f => f.CreatedAt).ToListAsync(ct);

        Dictionary<DateOnly, int> Bucket(IEnumerable<DateTimeOffset> times) => times
            .GroupBy(t => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(t, Turkey).DateTime))
            .ToDictionary(g => g.Key, g => g.Count());

        var u = Bucket(users);
        var c = Bucket(perfumeComments.Concat(comparisonComments));
        var r = Bucket(recs);
        var ra = Bucket(ratings);
        var v = Bucket(votes);
        var f = Bucket(favorites);

        var result = new List<AdminDailyDto>(days);
        for (var day = firstDay; day <= today; day = day.AddDays(1))
        {
            result.Add(new AdminDailyDto(
                day.ToString("yyyy-MM-dd"),
                u.GetValueOrDefault(day),
                c.GetValueOrDefault(day),
                r.GetValueOrDefault(day),
                ra.GetValueOrDefault(day),
                v.GetValueOrDefault(day),
                f.GetValueOrDefault(day)));
        }
        return result;
    }

    /// <summary>Danışman formunda hangi cinsiyet, ortam ve mevsimin ne sıklıkla seçildiği.</summary>
    private async Task<AdminAdvisorInsightsDto> BuildAdvisorInsightsAsync(DateTimeOffset since, CancellationToken ct)
    {
        var prompts = await db.UserPerfumeRecommendations.AsNoTracking()
            .Where(r => r.CreatedAt >= since)
            .Select(r => r.PromptJson)
            .ToListAsync(ct);

        var gender = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var occasion = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var season = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var json in prompts)
        {
            try
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json);
                Add(doc.RootElement, "Gender", gender);
                Add(doc.RootElement, "Occasion", occasion);
                Add(doc.RootElement, "Season", season);
            }
            catch (JsonException)
            {
                // Bozuk kayıt istatistiği bozmasın.
            }
        }

        static void Add(JsonElement root, string field, Dictionary<string, int> counts)
        {
            if (!root.TryGetProperty(field, out var value) || value.ValueKind != JsonValueKind.String)
                return;
            foreach (var part in (value.GetString() ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                counts[part.ToLowerInvariant()] = counts.GetValueOrDefault(part.ToLowerInvariant()) + 1;
        }

        static List<AdminChoiceDto> Sorted(Dictionary<string, int> counts) => counts
            .OrderByDescending(kv => kv.Value)
            .Select(kv => new AdminChoiceDto(kv.Key, kv.Value))
            .ToList();

        return new AdminAdvisorInsightsDto(Sorted(gender), Sorted(occasion), Sorted(season));
    }

    public async Task<IReadOnlyList<AdminBlogDto>> GetBlogsAsync(BlogPostStatus? status, CancellationToken ct = default)
    {
        var query = db.BlogPosts.AsNoTracking();
        if (status is not null)
            query = query.Where(b => b.Status == status);

        return await query
            .OrderBy(b => b.Status == BlogPostStatus.Pending ? 0 : 1)
            .ThenByDescending(b => b.CreatedAt)
            .Select(b => new AdminBlogDto(
                b.Id, b.Title, b.Slug, b.Excerpt, b.Body, b.CoverImageUrl, b.Category,
                b.Status.ToString(), b.ViewCount,
                b.Author.DisplayName ?? b.Author.Email, b.Author.Email,
                b.CreatedAt, b.UpdatedAt, b.PublishedAt))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<AdminCommentDto>> GetCommentsAsync(string kind, ModerationStatus? status, int take, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 500);

        if (kind == ComparisonKind)
        {
            var q = db.ComparisonComments.AsNoTracking().Where(c => !c.IsAiSummary);
            if (status is not null) q = q.Where(c => c.Status == status);

            var rows = await q.OrderByDescending(c => c.CreatedAt).Take(take)
                .Select(c => new
                {
                    c.Id, c.Body, c.Status, c.CreatedAt,
                    Author = c.User != null ? (c.User.DisplayName ?? c.User.Email) : "Misafir",
                    Email = c.User != null ? c.User.Email : null,
                    A = c.Perfume1.Brand.Name + " " + c.Perfume1.Name,
                    B = c.Perfume2.Brand.Name + " " + c.Perfume2.Name,
                    SlugA = c.Perfume1.Slug,
                    SlugB = c.Perfume2.Slug,
                })
                .ToListAsync(ct);

            return rows.Select(c => new AdminCommentDto(
                c.Id, ComparisonKind, c.Body, c.Status.ToString(), c.Author, c.Email,
                $"{c.A} vs {c.B}", $"{c.SlugA},{c.SlugB}", c.CreatedAt)).ToList();
        }

        var pq = db.PerfumeComments.AsNoTracking().Where(c => !c.IsAiSummary);
        if (status is not null) pq = pq.Where(c => c.Status == status);

        var perfumeRows = await pq.OrderByDescending(c => c.CreatedAt).Take(take)
            .Select(c => new
            {
                c.Id, c.Body, c.Status, c.CreatedAt,
                Author = c.User != null ? (c.User.DisplayName ?? c.User.Email) : "Misafir",
                Email = c.User != null ? c.User.Email : null,
                c.PerfumeId,
            })
            .ToListAsync(ct);

        var refs = await LoadPerfumeRefsAsync(perfumeRows.Select(r => r.PerfumeId).ToHashSet(), ct);
        return perfumeRows.Select(c => new AdminCommentDto(
            c.Id, PerfumeKind, c.Body, c.Status.ToString(), c.Author, c.Email,
            refs.TryGetValue(c.PerfumeId, out var p) ? $"{p.Brand} {p.Name}" : $"#{c.PerfumeId}",
            refs.TryGetValue(c.PerfumeId, out var p2) ? p2.Path : null,
            c.CreatedAt)).ToList();
    }

    public async Task<bool> SetCommentStatusAsync(string kind, int id, ModerationStatus status, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        if (kind == ComparisonKind)
        {
            var comment = await db.ComparisonComments.FirstOrDefaultAsync(c => c.Id == id && !c.IsAiSummary, ct);
            if (comment is null) return false;
            comment.Status = status;
            comment.UpdatedAt = now;
        }
        else
        {
            var comment = await db.PerfumeComments.FirstOrDefaultAsync(c => c.Id == id && !c.IsAiSummary, ct);
            if (comment is null) return false;
            comment.Status = status;
            comment.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<AdminRecommendationDto>> GetRecommendationsAsync(int take, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 500);
        var rows = await db.UserPerfumeRecommendations.AsNoTracking()
            .OrderByDescending(r => r.CreatedAt).Take(take)
            .Select(r => new
            {
                r.Id, r.PerfumeId, r.PromptJson, r.PerfumerAdvice, r.CreatedAt,
                UserName = r.User.DisplayName ?? r.User.Email,
                UserEmail = r.User.Email,
            })
            .ToListAsync(ct);

        var refs = await LoadPerfumeRefsAsync(rows.Select(r => r.PerfumeId).ToHashSet(), ct);
        return rows.Select(r =>
        {
            var p = refs.GetValueOrDefault(r.PerfumeId);
            return new AdminRecommendationDto(
                r.Id, r.UserName, r.UserEmail,
                p?.Name ?? $"#{r.PerfumeId}", p?.Brand ?? "", p?.Path ?? "",
                r.PromptJson, r.PerfumerAdvice, r.CreatedAt);
        }).ToList();
    }

    private async Task<Dictionary<int, PerfumeRef>> LoadPerfumeRefsAsync(IReadOnlyCollection<int> ids, CancellationToken ct)
    {
        if (ids.Count == 0) return [];

        var rows = await db.Perfumes.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.Slug, p.Gender, p.Concentration, BrandName = p.Brand.Name, BrandSlug = p.Brand.Slug })
            .ToListAsync(ct);

        return rows.ToDictionary(
            p => p.Id,
            p => new PerfumeRef(p.Name, p.BrandName, p.Slug, PerfumeUrl.Path(p.Gender, p.Concentration?.Slug(), p.BrandSlug, p.Slug)));
    }

    private static TimeZoneInfo ResolveTurkeyZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.CreateCustomTimeZone("TRT", TimeSpan.FromHours(3), "TRT", "TRT"); }
    }
}
