using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Controllers;

/// <summary>
/// Karşılaştırma yorumları. Karşılaştırma tablosunun verisi
/// <c>/api/perfumes/{slug}</c> uçlarından toplanır; burada sadece
/// iki parfüm hakkındaki tartışma tutulur.
/// </summary>
[ApiController]
[Route("api/compare")]
public class CompareController(AppDbContext db, ITokenService tokens) : ControllerBase
{
    /// <summary>Anasayfa için popüler karşılaştırma çiftleri.</summary>
    [HttpGet("popular")]
    public async Task<IActionResult> GetPopularComparisons(CancellationToken ct)
    {
        var list = new List<object>();
        var seenPairs = new HashSet<string>();

        var commentPairs = await db.ComparisonComments
            .AsNoTracking()
            .Where(c => c.Status == ModerationStatus.Approved)
            .GroupBy(c => new { c.Perfume1Id, c.Perfume2Id })
            .OrderByDescending(g => g.Count())
            .Take(12)
            .Select(g => new { g.Key.Perfume1Id, g.Key.Perfume2Id })
            .ToListAsync(ct);

        if (commentPairs.Count > 0)
        {
            var pIds = commentPairs.SelectMany(x => new[] { x.Perfume1Id, x.Perfume2Id }).Distinct().ToList();
            var perfumes = await db.Perfumes
                .AsNoTracking()
                .Include(p => p.Brand)
                .Where(p => pIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, ct);

            foreach (var pair in commentPairs)
            {
                if (perfumes.TryGetValue(pair.Perfume1Id, out var p1) && perfumes.TryGetValue(pair.Perfume2Id, out var p2))
                {
                    var key = $"{pair.Perfume1Id}-{pair.Perfume2Id}";
                    seenPairs.Add(key);
                    list.Add(new
                    {
                        Perfume1 = new { p1.Name, p1.Slug, BrandName = p1.Brand.Name, p1.ImageUrl, p1.Gender, p1.Concentration, p1.FragranceFamily, Path = PerfumeUrl.Path(p1.Gender, p1.Concentration?.Slug(), p1.Brand.Slug, p1.Slug) },
                        Perfume2 = new { p2.Name, p2.Slug, BrandName = p2.Brand.Name, p2.ImageUrl, p2.Gender, p2.Concentration, p2.FragranceFamily, Path = PerfumeUrl.Path(p2.Gender, p2.Concentration?.Slug(), p2.Brand.Slug, p2.Slug) },
                    });
                }
            }
        }

        if (list.Count < 12)
        {
            var alternatives = await db.PerfumeAlternatives
                .AsNoTracking()
                .Where(a => a.Kind == PerfumeRelationKind.RemindsMeOf && a.SourcePerfume.RatingCount > 200 && a.TargetPerfume.RatingCount > 200)
                .OrderByDescending(a => a.SimilarityRate)
                .ThenByDescending(a => a.SourcePerfume.RatingCount + a.TargetPerfume.RatingCount)
                .Take(24)
                .Select(a => new
                {
                    p1 = a.SourcePerfume,
                    p1Brand = a.SourcePerfume.Brand,
                    p2 = a.TargetPerfume,
                    p2Brand = a.TargetPerfume.Brand,
                })
                .ToListAsync(ct);

            foreach (var item in alternatives)
            {
                if (list.Count >= 12) break;
                var key = item.p1.Id < item.p2.Id ? $"{item.p1.Id}-{item.p2.Id}" : $"{item.p2.Id}-{item.p1.Id}";
                if (seenPairs.Contains(key)) continue;
                seenPairs.Add(key);

                list.Add(new
                {
                    Perfume1 = new { item.p1.Name, item.p1.Slug, BrandName = item.p1Brand.Name, item.p1.ImageUrl, item.p1.Gender, item.p1.Concentration, item.p1.FragranceFamily, Path = PerfumeUrl.Path(item.p1.Gender, item.p1.Concentration?.Slug(), item.p1Brand.Slug, item.p1.Slug) },
                    Perfume2 = new { item.p2.Name, item.p2.Slug, BrandName = item.p2Brand.Name, item.p2.ImageUrl, item.p2.Gender, item.p2.Concentration, item.p2.FragranceFamily, Path = PerfumeUrl.Path(item.p2.Gender, item.p2.Concentration?.Slug(), item.p2Brand.Slug, item.p2.Slug) },
                });
            }
        }

        return Ok(list);
    }

    /// <summary>Bir karşılaştırma (parfüm çifti) hakkındaki yorumlar ve AI özeti.</summary>
    [HttpGet("{p1Slug}-vs-{p2Slug}/comments")]
    public async Task<IActionResult> GetComparisonComments(string p1Slug, string p2Slug, CancellationToken ct)
    {
        var ids = await ResolvePairIdsAsync(p1Slug, p2Slug, ct);
        if (ids is null)
            return NotFound(new { message = "Karşılaştırılacak parfümlerden biri bulunamadı." });

        var (first, second) = ids.Value;

        var comments = await db.ComparisonComments
            .AsNoTracking()
            .Where(c => c.Perfume1Id == first && c.Perfume2Id == second
                        && c.Status == ModerationStatus.Approved)
            .OrderByDescending(c => c.IsAiSummary)
            .ThenByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Body,
                c.CreatedAt,
                c.UpdatedAt,
                c.IsAiSummary,
                AuthorName = c.User == null ? null : (c.User.DisplayName ?? c.User.Email),
                AuthorAvatar = c.User == null ? null : c.User.AvatarUrl,
                PreferredSlug = c.PreferredPerfumeId == null
                    ? null
                    : db.Perfumes.Where(p => p.Id == c.PreferredPerfumeId).Select(p => p.Slug).FirstOrDefault()
            })
            .ToListAsync(ct);

        return Ok(comments);
    }

    public record CreateComparisonCommentRequest(string Content, string? PreferredSlug);

    [HttpPost("{p1Slug}-vs-{p2Slug}/comments")]
    public async Task<IActionResult> AddComparisonComment(
        string p1Slug, string p2Slug, [FromBody] CreateComparisonCommentRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { message = "Yorum metni boş olamaz." });

        var ids = await ResolvePairIdsAsync(p1Slug, p2Slug, ct);
        if (ids is null)
            return NotFound(new { message = "Karşılaştırılacak parfümlerden biri bulunamadı." });

        var (first, second) = ids.Value;

        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Unauthorized(new { message = "Yorum yapmak için giriş yapmalısınız." });

        var user = await db.Users.FindAsync([principal.UserId], ct);
        if (user is null)
            return Unauthorized(new { message = "Oturum geçersiz. Lütfen tekrar giriş yapın." });

        int? preferredId = null;
        if (!string.IsNullOrWhiteSpace(request.PreferredSlug))
        {
            preferredId = await db.Perfumes
                .Where(p => p.Slug == request.PreferredSlug)
                .Select(p => (int?)p.Id)
                .FirstOrDefaultAsync(ct);
        }

        var comment = new ComparisonComment
        {
            Perfume1Id = first,
            Perfume2Id = second,
            UserId = user.Id,
            Body = request.Content.Trim(),
            PreferredPerfumeId = preferredId,
            Status = ModerationStatus.Approved,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.ComparisonComments.Add(comment);
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Yorumunuz eklendi.", id = comment.Id });
    }

    /// <summary>İki slug'ı normalize edilmiş parfüm id çiftine çevirir.</summary>
    private async Task<(int First, int Second)?> ResolvePairIdsAsync(string p1Slug, string p2Slug, CancellationToken ct)
    {
        var ids = await db.Perfumes
            .AsNoTracking()
            .Where(p => p.Slug == p1Slug || p.Slug == p2Slug)
            .Select(p => new { p.Id, p.Slug })
            .ToListAsync(ct);

        var id1 = ids.FirstOrDefault(x => x.Slug == p1Slug)?.Id;
        var id2 = ids.FirstOrDefault(x => x.Slug == p2Slug)?.Id;

        if (id1 is null || id2 is null)
            return null;

        return ComparisonComment.NormalizePair(id1.Value, id2.Value);
    }
}
