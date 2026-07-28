using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Controllers;

[ApiController]
[Route("api")]
public class CatalogController(ICatalogService catalog, AppDbContext db, ITokenService tokens) : ControllerBase
{
    [HttpGet("perfumes")]
    public async Task<IActionResult> GetPerfumes([FromQuery] PerfumeListQuery query, CancellationToken ct)
    {
        var result = await catalog.GetPerfumesAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("perfumes/{slug}")]
    public async Task<IActionResult> GetPerfumeDetail(string slug, CancellationToken ct)
    {
        var dto = await catalog.GetPerfumeDetailAsync(slug, ct);
        return dto is not null ? Ok(dto) : NotFound();
    }

    [HttpGet("brands")]
    public async Task<IActionResult> GetBrands(CancellationToken ct)
    {
        var result = await catalog.GetBrandsAsync(ct);
        return Ok(result);
    }

    [HttpGet("brands/{slug}")]
    public async Task<IActionResult> GetBrandDetail(string slug, CancellationToken ct)
    {
        var dto = await catalog.GetBrandDetailAsync(slug, ct);
        return dto is not null ? Ok(dto) : NotFound();
    }

    [HttpGet("meta/filters")]
    public async Task<IActionResult> GetFilterMeta(CancellationToken ct)
    {
        var result = await catalog.GetFilterMetaAsync(ct);
        return Ok(result);
    }

    /// <summary>
    /// Parfüm yorumları. AI özeti de bir yorumdur (<c>isAiSummary</c>), sadece
    /// yazarı yoktur ve listede en üstte döner.
    /// </summary>
    [HttpGet("perfumes/{slug}/comments")]
    public async Task<IActionResult> GetPerfumeComments(string slug, CancellationToken ct)
    {
        var perfumeId = await db.Perfumes.AsNoTracking()
            .Where(p => p.Slug == slug)
            .Select(p => (int?)p.Id)
            .FirstOrDefaultAsync(ct);

        if (perfumeId is null) return NotFound("Parfüm bulunamadı.");

        var comments = await db.PerfumeComments
            .AsNoTracking()
            .Where(c => c.PerfumeId == perfumeId && c.Status == ModerationStatus.Approved)
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
                Rating = db.Ratings
                    .Where(r => r.PerfumeId == perfumeId && r.UserId == c.UserId)
                    .Select(r => (int?)r.Score)
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        return Ok(comments);
    }

    public record SubmitCommentDto(short Rating, string Content);

    [HttpPost("perfumes/{slug}/comments")]
    public async Task<IActionResult> SubmitComment(string slug, [FromBody] SubmitCommentDto dto, CancellationToken ct)
    {
        if (dto.Rating < 1 || dto.Rating > 5 || string.IsNullOrWhiteSpace(dto.Content))
        {
            return BadRequest("Lütfen geçerli bir puan (1-5) ve yorum girin.");
        }

        var perfume = await db.Perfumes.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (perfume == null) return NotFound("Parfüm bulunamadı.");

        // Yorum yazmak için giriş zorunlu.
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Unauthorized(new { message = "Yorum yapmak için giriş yapmalısınız." });

        var user = await db.Users.FindAsync([principal.UserId], ct);
        if (user is null)
            return Unauthorized(new { message = "Oturum geçersiz. Lütfen tekrar giriş yapın." });

        // Puan kaydı oluştur veya güncelle
        var rating = await db.Ratings.FirstOrDefaultAsync(r => r.PerfumeId == perfume.Id && r.UserId == user.Id, ct);
        if (rating == null)
        {
            rating = new Rating
            {
                PerfumeId = perfume.Id,
                UserId = user.Id,
                Score = dto.Rating,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Ratings.Add(rating);
        }
        else
        {
            rating.Score = dto.Rating;
            rating.UpdatedAt = DateTimeOffset.UtcNow;
        }

        var comment = new PerfumeComment
        {
            PerfumeId = perfume.Id,
            UserId = user.Id,
            Body = dto.Content.Trim(),
            Status = ModerationStatus.Approved, // Hemen görebilmek için otomatik onaylı
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.PerfumeComments.Add(comment);
        await db.SaveChangesAsync(ct);

        // Parfümün ortalama puanını ve değerlendirme sayısını güncelle
        var ratings = await db.Ratings.Where(r => r.PerfumeId == perfume.Id).Select(r => r.Score).ToListAsync(ct);
        perfume.RatingCount = ratings.Count;
        perfume.AvgRating = ratings.Count > 0 ? (decimal)ratings.Average(r => r) : 0m;

        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Yorumunuz başarıyla eklendi!",
            comment = new
            {
                comment.Id,
                comment.Body,
                comment.CreatedAt,
                AuthorName = user.DisplayName ?? user.Email,
                Rating = dto.Rating
            }
        });
    }
}
