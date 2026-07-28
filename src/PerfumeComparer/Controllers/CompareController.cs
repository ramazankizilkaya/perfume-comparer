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
