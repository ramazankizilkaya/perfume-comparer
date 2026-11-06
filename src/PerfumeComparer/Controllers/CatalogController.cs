using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Ai;
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
    IAiClient ai,
    AiSummaryJob aiSummary,
    IAiRequestGate aiGate,
    ICommentContentFilter commentFilter,
    IImageWebpService imageWebp) : ControllerBase
{
    [HttpGet("perfumes")]
    public async Task<IActionResult> GetPerfumes([FromQuery] PerfumeListQuery query, CancellationToken ct)
    {
        var userId = tokens.Validate(Request.Headers.Authorization.ToString())?.UserId;
        var result = await catalog.GetPerfumesAsync(query, userId, ct);
        return Ok(result);
    }

    [HttpPost("perfumes/{slug}/favorite")]
    public async Task<IActionResult> ToggleFavorite(string slug, CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Unauthorized(new { message = "Favorilere eklemek için giriş yapmalısınız." });

        var perfume = await db.Perfumes.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (perfume == null) return NotFound("Parfüm bulunamadı.");

        var existing = await db.Favorites.FirstOrDefaultAsync(f => f.UserId == principal.UserId && f.PerfumeId == perfume.Id, ct);
        bool isFavorited;
        if (existing != null)
        {
            db.Favorites.Remove(existing);
            isFavorited = false;
        }
        else
        {
            db.Favorites.Add(new Favorite
            {
                UserId = principal.UserId,
                PerfumeId = perfume.Id,
                CreatedAt = DateTimeOffset.UtcNow
            });
            isFavorited = true;
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // İki sekmeden aynı anda gelen istek: (UserId, PerfumeId) anahtarı çakıştı,
            // 500 yerine güncel durumu döndür.
            db.ChangeTracker.Clear();
            isFavorited = await db.Favorites.AsNoTracking()
                .AnyAsync(f => f.UserId == principal.UserId && f.PerfumeId == perfume.Id, ct);
        }

        return Ok(new { favorited = isFavorited });
    }

    [HttpGet("perfumes/{slug}")]
    public async Task<IActionResult> GetPerfumeDetail(string slug, CancellationToken ct)
    {
        var dto = await catalog.GetPerfumeDetailAsync(slug, ct);
        return dto is not null ? Ok(dto) : NotFound();
    }

    /// <summary>
    /// Görüntülenme bildirimi. Detay sayfası sunucuda render edildiği için GET detay
    /// isteği ziyaretçinin değil Next sunucusunun IP'sinden gelir; sayım bu yüzden
    /// tarayıcıdan atılan ayrı bir POST ile yapılır. IP, UseForwardedHeaders ile yalnızca
    /// güvenilen proxy'den gelen X-Forwarded-For'a göre çözülür; başlık elle taklit edilemez.
    /// </summary>
    [HttpPost("perfumes/{slug}/view")]
    public async Task<IActionResult> RecordView(string slug, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var viewCount = await catalog.RecordViewAsync(slug, ip, ct);
        return viewCount is null ? NotFound(new { message = "Parfüm bulunamadı." }) : Ok(new { viewCount });
    }

    [HttpGet("brands")]
    public async Task<IActionResult> GetBrands(CancellationToken ct)
    {
        var result = await catalog.GetBrandsAsync(ct);
        return Ok(result);
    }

    [HttpGet("brands/random")]
    public async Task<IActionResult> GetRandomBrands([FromQuery] int count = 20, CancellationToken ct = default)
    {
        var result = await catalog.GetRandomBrandsAsync(count, ct);
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
    /// Bir parfümün AI yorum özetini üretir (yoksa) ve döndürür. Detay sayfası
    /// açılışta bunu çağırır; yorum sayısı eşiğin altındaysa 204 döner. Eldeki özet
    /// herkese döner; yeni üretim giriş yapmış kullanıcıya serbest, anonim ziyaretçiye
    /// IP başına sınırlıdır (IAiRequestGate).
    /// </summary>
    [HttpPost("perfumes/{slug}/ai-summary")]
    public async Task<IActionResult> EnsureAiSummary(string slug, CancellationToken ct)
    {
        var summary = await aiSummary.EnsurePerfumeSummaryAsync(slug, () => aiGate.TryEnter(HttpContext), ct);
        if (summary is null) return NoContent();

        return Ok(new
        {
            summary.Id,
            summary.Body,
            summary.CreatedAt,
            summary.UpdatedAt,
            summary.IsAiSummary,
            summary.SourceCommentCount,
        });
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

        if (dto.Content.Trim().Length > PerfumeComment.MaxBodyLength)
            return BadRequest(new { message = $"Yorum en fazla {PerfumeComment.MaxBodyLength} karakter olabilir." });

        if (commentFilter.ContainsProfanity(dto.Content))
            return BadRequest(new { message = CommentContentFilter.RejectedMessage });

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
        string? Comment,
        /// <summary>"Bunu sevenler şunları da sevdi" için kullanıcının seçtiği parfüm slug'ları.</summary>
        string[]? SimilarPerfumes = null,
        /// <summary>"Bunu hatırlatıyor" için kullanıcının seçtiği parfüm slug'ları.</summary>
        string[]? RemindsOfPerfumes = null);

    /// <summary>
    /// Giriş yapan kullanıcının bu parfümü daha önce değerlendirip değerlendirmediğini döner.
    /// </summary>
    [HttpGet("perfumes/{slug}/my-evaluation")]
    public async Task<IActionResult> GetMyEvaluation(string slug, CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Ok(new { hasEvaluated = false, score = (short?)null });

        var perfumeId = await db.Perfumes.AsNoTracking()
            .Where(p => p.Slug == slug)
            .Select(p => (int?)p.Id)
            .FirstOrDefaultAsync(ct);

        if (perfumeId is null) return NotFound(new { message = "Parfüm bulunamadı." });

        var rating = await db.Ratings.AsNoTracking()
            .FirstOrDefaultAsync(r => r.PerfumeId == perfumeId && r.UserId == principal.UserId, ct);

        return Ok(new
        {
            hasEvaluated = rating != null,
            score = rating?.Score
        });
    }

    /// <summary>
    /// Kapsamlı parfüm değerlendirmesi (Puan, Mevsim, Kalıcılık, Silaj, Fiyat/Değer, Cinsiyet, Yorum).
    /// Kullanıcı başına parfüm başına yalnızca 1 kez değerlendirme yapılabilir.
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

        // Kullanıcı aynı parfümü 2. kez değerlendiremez
        var alreadyReviewed = await db.Ratings.AnyAsync(r => r.PerfumeId == perfume.Id && r.UserId == user.Id, ct);
        if (alreadyReviewed)
        {
            return BadRequest(new { message = "Bu parfümü daha önce değerlendirdiniz. Bir parfüm yalnızca bir kez değerlendirilebilir." });
        }

        // Genel puan zorunludur (1 - 5)
        if (dto.Score is null or < 1 or > 5)
        {
            return BadRequest(new { message = "Lütfen 1 ile 5 arasında genel bir puan seçin." });
        }

        // Yorum sınırı en başta denetlenir ki puan kaydedilip yorum 500 vermesin.
        if (dto.Comment is not null && dto.Comment.Trim().Length > PerfumeComment.MaxBodyLength)
            return BadRequest(new { message = $"Yorum en fazla {PerfumeComment.MaxBodyLength} karakter olabilir." });

        if (commentFilter.ContainsProfanity(dto.Comment))
            return BadRequest(new { message = CommentContentFilter.RejectedMessage });

        // 1. Puan kaydı (tüm kayıtlar tek SaveChanges ile yazılır: ya hepsi ya hiçbiri)
        db.Ratings.Add(new Rating
        {
            PerfumeId = perfume.Id,
            UserId = user.Id,
            Score = dto.Score.Value,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

        var ratings = await db.Ratings.AsNoTracking()
            .Where(r => r.PerfumeId == perfume.Id).Select(r => (int)r.Score).ToListAsync(ct);
        ratings.Add(dto.Score.Value);
        perfume.UserRatingCount = ratings.Count;
        perfume.UserAvgRating = (decimal)ratings.Average();

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

        // 7. Mevsim oyları: seçilen mevsimlerin oy sayısını artır ve 0-100 normalize skoru güncelle.
        await SaveSeasonsAsync(perfume.Id, dto.Seasons, ct);

        // 8. Kullanıcının bildirdiği benzer / hatırlatan parfümler.
        // Slug'lar id'ye çevrilip perfume_alternatives merge tablosuna yazılır;
        // aynı ikili tekrar gelirse tarihi tazelenir, böylece listenin başına geçer.
        await SaveRelationsAsync(perfume.Id, dto.RemindsOfPerfumes, PerfumeRelationKind.RemindsMeOf, ct);
        await SaveRelationsAsync(perfume.Id, dto.SimilarPerfumes, PerfumeRelationKind.PeopleAlsoLike, ct);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Eşzamanlı ikinci istek (UserId, PerfumeId) anahtarına takıldı; veri bozulmaz.
            return Conflict(new { message = "Bu parfümü daha önce değerlendirdiniz. Bir parfüm yalnızca bir kez değerlendirilebilir." });
        }

        return Ok(new { message = "Değerlendirmeniz başarıyla kaydedildi!" });
    }

    private static Season? ParseSeasonVote(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "spring" or "ilkbahar" => Season.Spring,
        "summer" or "yaz" => Season.Summer,
        "autumn" or "fall" or "sonbahar" => Season.Autumn,
        "winter" or "kis" or "kış" => Season.Winter,
        _ => null,
    };

    private async Task SaveSeasonsAsync(int perfumeId, string[]? rawSeasons, CancellationToken ct)
    {
        if (rawSeasons is null || rawSeasons.Length == 0) return;

        var selected = rawSeasons
            .Select(ParseSeasonVote)
            .Where(s => s.HasValue)
            .Select(s => s!.Value)
            .Distinct()
            .ToArray();

        if (selected.Length == 0) return;

        var rows = await db.PerfumeSeasons
            .Where(s => s.PerfumeId == perfumeId)
            .ToListAsync(ct);

        foreach (var season in selected)
        {
            var row = rows.FirstOrDefault(r => r.Season == season);
            if (row is null)
            {
                row = new PerfumeSeason
                {
                    PerfumeId = perfumeId,
                    Season = season,
                    Votes = 1,
                    Score = 0,
                };
                rows.Add(row);
                db.PerfumeSeasons.Add(row);
            }
            else
            {
                row.Votes++;
            }
        }

        var maxVotes = rows.Count > 0 ? rows.Max(r => r.Votes) : 0;
        foreach (var row in rows)
        {
            row.Score = maxVotes > 0
                ? (short)Math.Round(row.Votes * 100.0 / maxVotes)
                : (short)0;
        }
    }

    /// <summary>
    /// Kullanıcı seçimlerini parfüm id'lerine çevirip ilişki tablosuna yazar.
    /// Kendine bağlama ve bilinmeyen slug sessizce atlanır.
    /// </summary>
    private async Task SaveRelationsAsync(
        int sourceId, string[]? slugs, PerfumeRelationKind kind, CancellationToken ct)
    {
        if (slugs is null || slugs.Length == 0) return;

        var wanted = slugs
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct()
            .ToArray();

        if (wanted.Length == 0) return;

        var targets = await db.Perfumes.AsNoTracking()
            .Where(p => wanted.Contains(p.Slug) && p.Id != sourceId)
            .Select(p => p.Id)
            .ToListAsync(ct);

        if (targets.Count == 0) return;

        var existing = await db.PerfumeAlternatives
            .Where(a => a.SourcePerfumeId == sourceId && a.Kind == kind && targets.Contains(a.TargetPerfumeId))
            .ToListAsync(ct);

        var now = DateTimeOffset.UtcNow;
        short sortIndex = 0;

        foreach (var targetId in targets)
        {
            var row = existing.FirstOrDefault(a => a.TargetPerfumeId == targetId);
            if (row is null)
            {
                db.PerfumeAlternatives.Add(new PerfumeAlternative
                {
                    SourcePerfumeId = sourceId,
                    TargetPerfumeId = targetId,
                    Kind = kind,
                    SortOrder = sortIndex++,
                    CreatedAt = now,
                });
            }
            else
            {
                row.CreatedAt = now;
                row.SortOrder = sortIndex++;
            }
        }
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
    /// Kullanıcı parfüm fotoğrafı yükleme. yapay zekâ ile görsel doğrulanır ve kaydedilir.
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

        // Dosya türü adından değil ilk baytlarından belirlenir; yalnızca JPG, PNG, WebP.
        var mimeType = imageWebp.DetectMimeType(fileBytes);
        if (mimeType is null)
            return BadRequest(new { message = "Yalnızca JPG, PNG veya WebP görsel yükleyebilirsiniz." });

        var webpBytes = await imageWebp.ConvertToWebpAsync(fileBytes, ct);
        if (webpBytes is null)
            return BadRequest(new { message = "Yalnızca JPG, PNG veya WebP görsel yükleyebilirsiniz." });

        // Yapay zekâ ile görsel doğrulama (görsel destekleyen sağlayıcılar). Reddederse dosya kaydedilmez;
        // geçerse WebP olarak kaydedilir ve admin onayına düşer (IsApproved = false).
        PhotoVerdict? verdict = null;
        if (ai.Enabled)
        {
            verdict = await ai.GenerateJsonAsync<PhotoVerdict>($$"""
                Sen bir parfüm web sitesi görsel denetleyicisisin.
                Kullanıcı bu fotoğrafı '{{perfume.Name}}' parfümü için yükledi.
                Bu görsel gerçekten bir parfüm şişesi / parfüm kutusu / parfüm ürünü fotoğrafı mıdır?
                Müstehcenlik, uygunsuzluk, alakasız insan veya tamamen ilgisiz nesneler içeriyor mu?

                Yanıtı yalnızca saf JSON olarak döndür:
                {
                  "isValid": true veya false,
                  "reason": "Kısa Türkçe açıklama (ör. Uygun parfüm şişesi görseli / Görselde parfüm şişesi tespit edilemedi)"
                }
                """, webpBytes, "image/webp", ct);
        }

        if (verdict is { IsValid: false })
        {
            return BadRequest(new
            {
                message = verdict.Reason ?? "Yüklenen görsel parfüm şişesi veya ürünü olarak doğrulanamadı. Lütfen net bir parfüm fotoğrafı yükleyin."
            });
        }

        // Görsel WebP biçiminde repo dışındaki kalıcı klasöre yazılır ve yönetici onayına sunulur.
        var imageUrl = await imageWebp.SaveWebpAsync(webpBytes, perfume.Slug, ct);

        var userPhoto = new PerfumeUserPhoto
        {
            PerfumeId = perfume.Id,
            UserId = user.Id,
            ImageUrl = imageUrl,
            IsApproved = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.PerfumeUserPhotos.Add(userPhoto);
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Fotoğrafınız alındı; kontrol edildikten sonra yayınlanacak.",
            pending = true,
            photo = new
            {
                userPhoto.Id,
                userPhoto.ImageUrl,
                AuthorName = user.DisplayName ?? user.Email,
                userPhoto.CreatedAt
            }
        });
    }
}
