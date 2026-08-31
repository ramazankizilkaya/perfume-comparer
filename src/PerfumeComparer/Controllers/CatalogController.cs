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
public class CatalogController(
    ICatalogService catalog,
    IUsageService usage,
    AppDbContext db,
    ITokenService tokens,
    IGeminiClient gemini) : ControllerBase
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
        var ip = GetClientIp();
        var dto = await catalog.GetPerfumeDetailAsync(slug, ip, ct);
        return dto is not null ? Ok(dto) : NotFound();
    }

    private string? GetClientIp()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded) && !string.IsNullOrWhiteSpace(forwarded))
        {
            var ip = forwarded.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(ip)) return ip;
        }

        if (Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrWhiteSpace(realIp))
        {
            return realIp.ToString().Trim();
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
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

    public record UsageDto(string AgeGroup);

    /// <summary>
    /// "Bu parfümü kullanıyorum" bildirimi. Yaş grubu dağılımının tek kaynağı budur;
    /// giriş zorunlu değildir, ama girişli kullanıcı parfüm başına yalnızca bir kez sayılır.
    /// </summary>
    [HttpPost("perfumes/{slug}/kullaniyorum")]
    public async Task<IActionResult> RecordUsage(string slug, [FromBody] UsageDto dto, CancellationToken ct)
    {
        var userId = tokens.Validate(Request.Headers.Authorization.ToString())?.UserId;

        try
        {
            var result = await usage.RecordAsync(slug, dto.AgeGroup, userId, ct);
            return result is null ? NotFound(new { message = "Parfüm bulunamadı." }) : Ok(result);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { message = "Lütfen geçerli bir yaş grubu seçin." });
        }
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

        // Site kullanıcılarının ortalamasını güncelle. Kartlarda görünen AvgRating
        // topluluk puanıdır (kaynak veriden gelir), buradan değişmez.
        var ratings = await db.Ratings.Where(r => r.PerfumeId == perfume.Id).Select(r => r.Score).ToListAsync(ct);
        perfume.UserRatingCount = ratings.Count;
        perfume.UserAvgRating = ratings.Count > 0 ? (decimal)ratings.Average(r => r) : 0m;

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

    public record PerfumeReviewDto(
        short? Score,
        string? Longevity,
        string? Sillage,
        string? PriceValue,
        string? GenderOpinion,
        string[]? Seasons,
        string? Comment);

    /// <summary>
    /// Kapsamlı parfüm değerlendirmesi (Puan, Mevsim, Kalıcılık, Silaj, Fiyat/Değer, Cinsiyet, Yorum).
    /// Kısmi girişleri de kabul eder.
    /// </summary>
    [HttpPost("perfumes/{slug}/review")]
    public async Task<IActionResult> SubmitReview(string slug, [FromBody] PerfumeReviewDto dto, CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Unauthorized(new { message = "Değerlendirme yapmak için giriş yapmalısınız." });

        var user = await db.Users.FindAsync([principal.UserId], ct);
        if (user is null)
            return Unauthorized(new { message = "Oturum geçersiz. Lütfen tekrar giriş yapın." });

        var perfume = await db.Perfumes.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (perfume == null) return NotFound(new { message = "Parfüm bulunamadı." });

        // 1. Puan kaydı
        if (dto.Score is >= 1 and <= 5)
        {
            var rating = await db.Ratings.FirstOrDefaultAsync(r => r.PerfumeId == perfume.Id && r.UserId == user.Id, ct);
            if (rating == null)
            {
                db.Ratings.Add(new Rating
                {
                    PerfumeId = perfume.Id,
                    UserId = user.Id,
                    Score = dto.Score.Value,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
            else
            {
                rating.Score = dto.Score.Value;
                rating.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await db.SaveChangesAsync(ct);
            var ratings = await db.Ratings.Where(r => r.PerfumeId == perfume.Id).Select(r => r.Score).ToListAsync(ct);
            perfume.UserRatingCount = ratings.Count;
            perfume.UserAvgRating = ratings.Count > 0 ? (decimal)ratings.Average(r => r) : 0m;
        }

        // 2. Yorum kaydı
        if (!string.IsNullOrWhiteSpace(dto.Comment))
        {
            db.PerfumeComments.Add(new PerfumeComment
            {
                PerfumeId = perfume.Id,
                UserId = user.Id,
                Body = dto.Comment.Trim(),
                Status = ModerationStatus.Approved,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        // 3. Kalıcılık oyu
        if (!string.IsNullOrWhiteSpace(dto.Longevity))
        {
            switch (dto.Longevity.ToLowerInvariant())
            {
                case "very_weak": perfume.LongevityVeryWeak++; break;
                case "weak": perfume.LongevityWeak++; break;
                case "moderate": perfume.LongevityModerate++; break;
                case "long_lasting": perfume.LongevityLongLasting++; break;
                case "eternal": perfume.LongevityEternal++; break;
            }
        }

        // 4. Silaj oyu
        if (!string.IsNullOrWhiteSpace(dto.Sillage))
        {
            switch (dto.Sillage.ToLowerInvariant())
            {
                case "intimate": perfume.SillageIntimate++; break;
                case "moderate": perfume.SillageModerate++; break;
                case "strong": perfume.SillageStrong++; break;
                case "enormous": perfume.SillageEnormous++; break;
            }
        }

        // 5. Fiyat / Değer oyu
        if (!string.IsNullOrWhiteSpace(dto.PriceValue))
        {
            switch (dto.PriceValue.ToLowerInvariant())
            {
                case "way_overpriced": perfume.PriceWayOverpriced++; break;
                case "overpriced": perfume.PriceOverpriced++; break;
                case "ok":
                case "fair": perfume.PriceFair++; break;
                case "good_value": perfume.PriceGoodValue++; break;
                case "great_value": perfume.PriceGreatValue++; break;
            }
        }

        // 6. Cinsiyet oyu
        if (!string.IsNullOrWhiteSpace(dto.GenderOpinion))
        {
            switch (dto.GenderOpinion.ToLowerInvariant())
            {
                case "female": perfume.GenderVoteFemale++; break;
                case "more_female": perfume.GenderVoteMoreFemale++; break;
                case "unisex": perfume.GenderVoteUnisex++; break;
                case "more_male": perfume.GenderVoteMoreMale++; break;
                case "male": perfume.GenderVoteMale++; break;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Değerlendirmeniz başarıyla kaydedildi!" });
    }

    /// <summary>
    /// Kullanıcılardan gelen parfüm fotoğraflarını listele.
    /// </summary>
    [HttpGet("perfumes/{slug}/photos")]
    public async Task<IActionResult> GetUserPhotos(string slug, CancellationToken ct)
    {
        var perfumeId = await db.Perfumes.AsNoTracking()
            .Where(p => p.Slug == slug)
            .Select(p => (int?)p.Id)
            .FirstOrDefaultAsync(ct);

        if (perfumeId is null) return NotFound(new { message = "Parfüm bulunamadı." });

        var photos = await db.PerfumeUserPhotos.AsNoTracking()
            .Where(p => p.PerfumeId == perfumeId && p.IsApproved)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.ImageUrl,
                AuthorName = p.User.DisplayName ?? p.User.Email,
                p.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(photos);
    }

    /// <summary>
    /// Kullanıcı parfüm fotoğrafı yükleme. Gemini AI ile görsel doğrulanır ve kaydedilir.
    /// </summary>
    [HttpPost("perfumes/{slug}/photos")]
    public async Task<IActionResult> UploadPhoto(string slug, IFormFile photo, CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Unauthorized(new { message = "Fotoğraf yüklemek için giriş yapmalısınız." });

        var user = await db.Users.FindAsync([principal.UserId], ct);
        if (user is null)
            return Unauthorized(new { message = "Oturum geçersiz. Lütfen tekrar giriş yapın." });

        var perfume = await db.Perfumes.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (perfume == null) return NotFound(new { message = "Parfüm bulunamadı." });

        if (photo == null || photo.Length == 0)
            return BadRequest(new { message = "Lütfen geçerli bir görsel dosyası seçin." });

        if (photo.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "Görsel boyutu 10MB'dan küçük olmalıdır." });

        byte[] fileBytes;
        using (var ms = new MemoryStream())
        {
            await photo.CopyToAsync(ms, ct);
            fileBytes = ms.ToArray();
        }

        // Gemini AI ile görsel doğrulama. Anahtar yoksa ya da çağrı başarısızsa
        // görsel kabul edilir; doğrulama bir bonus, geçit değil.
        var mimeType = photo.ContentType.StartsWith("image/") ? photo.ContentType : "image/jpeg";
        var verdict = await gemini.GenerateJsonAsync<PhotoVerdict>($$"""
            Sen bir parfüm web sitesi görsel denetleyicisisin.
            Kullanıcı bu fotoğrafı '{{perfume.Name}}' parfümü için yükledi.
            Bu görsel gerçekten bir parfüm şişesi / parfüm kutusu / parfüm ürünü fotoğrafı mıdır?
            Müstehcenlik, uygunsuzluk, alakasız insan veya tamamen ilgisiz nesneler içeriyor mu?

            Yanıtı yalnızca saf JSON olarak döndür:
            {
              "isValid": true veya false,
              "reason": "Kısa Türkçe açıklama (ör. Uygun parfüm şişesi görseli / Görselde parfüm şişesi tespit edilemedi)"
            }
            """, fileBytes, mimeType, ct);

        var isAiApproved = verdict?.IsValid ?? true;
        var rejectionReason = verdict?.Reason;

        if (!isAiApproved)
        {
            return BadRequest(new
            {
                message = rejectionReason ?? "Yüklenen görsel parfüm şişesi veya ürünü olarak doğrulanamadı. Lütfen net bir parfüm fotoğrafı yükleyin."
            });
        }

        // Görseli scrape_files/user_uploads/{slug}/ dizinine kaydet
        var uploadDir = Path.GetFullPath(Path.Combine(
            builder_media_root(HttpContext) ?? "scrape_files",
            "user_uploads",
            perfume.Slug));

        Directory.CreateDirectory(uploadDir);

        var ext = Path.GetExtension(photo.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext) || ext == ".jfif") ext = ".jpg";
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadDir, fileName);

        await System.IO.File.WriteAllBytesAsync(filePath, fileBytes, ct);

        var relativePath = $"/media/user_uploads/{perfume.Slug}/{fileName}";

        var userPhoto = new PerfumeUserPhoto
        {
            PerfumeId = perfume.Id,
            UserId = user.Id,
            ImageUrl = relativePath,
            IsApproved = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.PerfumeUserPhotos.Add(userPhoto);
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Fotoğrafınız başarıyla yüklendi ve yayına alındı!",
            photo = new
            {
                userPhoto.Id,
                userPhoto.ImageUrl,
                AuthorName = user.DisplayName ?? user.Email,
                userPhoto.CreatedAt
            }
        });
    }

    private static string builder_media_root(HttpContext context)
    {
        var config = context.RequestServices.GetRequiredService<IConfiguration>();
        var env = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
        return Path.GetFullPath(Path.Combine(env.ContentRootPath, config["Media:Root"] ?? "../../scrape_files"));
    }
}
