using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Controllers.Filters;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Controllers;

[ApiController]
[Route("api/blogs")]
public class BlogController(AppDbContext db, ITokenService tokens, IImageWebpService imageWebp) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetBlogs([FromQuery] bool random = false, [FromQuery] int? take = null, CancellationToken ct = default)
    {
        var query = db.BlogPosts
            .AsNoTracking()
            .Where(b => b.Status == BlogPostStatus.Published);

        if (random)
        {
            query = query.OrderBy(_ => EF.Functions.Random());
        }
        else
        {
            query = query.OrderByDescending(b => b.PublishedAt);
        }

        if (take.HasValue && take.Value > 0)
        {
            query = query.Take(take.Value);
        }

        var posts = await query
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.CoverImageUrl,
                b.Category,
                b.ViewCount,
                b.PublishedAt,
                AuthorName = b.Author.DisplayName ?? b.Author.Email
            })
            .ToListAsync(ct);

        return Ok(posts);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyBlogs(CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal == null)
            return Unauthorized(new { message = "Yazılarınızı görüntülemek için lütfen giriş yapın." });

        var posts = await db.BlogPosts
            .AsNoTracking()
            .Where(b => b.AuthorUserId == (int)principal.UserId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.CoverImageUrl,
                b.ViewCount,
                b.PublishedAt,
                b.CreatedAt,
                Status = b.Status.ToString(),
                AuthorName = b.Author.DisplayName ?? b.Author.Email
            })
            .ToListAsync(ct);

        return Ok(posts);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBlogDetail(string slug, CancellationToken ct)
    {
        var post = await db.BlogPosts
            .Include(b => b.Author)
            .Where(b => b.Slug == slug && b.Status == BlogPostStatus.Published)
            .FirstOrDefaultAsync(ct);

        if (post == null)
            return NotFound();

        post.ViewCount++;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            // Sayım hatası durumunda okumayı kesme
        }

        return Ok(new
        {
            post.Id,
            post.Title,
            post.Slug,
            post.Body,
            post.Excerpt,
            post.CoverImageUrl,
            post.Category,
            post.ViewCount,
            post.PublishedAt,
            AuthorName = post.Author.DisplayName ?? post.Author.Email,
            AuthorAvatar = post.Author.AvatarUrl
        });
    }

    public record CreateBlogPostDto(string Title, string Body, string? Excerpt, string? CoverImageUrl);

    /// <summary>Blog kapak veya içerik görseli yükleme: JPG/PNG/WebP alır, WebP olarak kaydeder.</summary>
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadBlogImage(IFormFile image, CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal == null || !await db.Users.AnyAsync(u => u.Id == principal.UserId, ct))
            return Unauthorized(new { message = "Görsel yüklemek için giriş yapmalısınız." });

        if (image == null || image.Length == 0)
            return BadRequest(new { message = "Lütfen geçerli bir görsel dosyası seçin." });

        if (image.Length > ImageWebpService.MaxImageBytes)
            return BadRequest(new { message = "Görsel boyutu 10MB'dan küçük olmalıdır." });

        byte[] fileBytes;
        using (var ms = new MemoryStream())
        {
            await image.CopyToAsync(ms, ct);
            fileBytes = ms.ToArray();
        }

        if (imageWebp.DetectMimeType(fileBytes) is null)
            return BadRequest(new { message = "Yalnızca JPG, PNG veya WebP görsel yükleyebilirsiniz." });

        var webpBytes = await imageWebp.ConvertToWebpAsync(fileBytes, ct);
        if (webpBytes is null)
            return BadRequest(new { message = "Görsel işlenemedi. Lütfen geçerli bir JPG, PNG veya WebP dosyası seçin." });

        var imageUrl = await imageWebp.SaveWebpAsync(webpBytes, "blogs", ct);
        return Ok(new { imageUrl });
    }

    /// <summary>Yazı gönderimi giriş ister; yazı Pending durumunda kaydedilir ve admin onayı bekler.</summary>
    [HttpPost]
    public async Task<IActionResult> CreateBlog([FromBody] CreateBlogPostDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
        {
            return BadRequest(new { message = "Başlık ve içerik alanları zorunludur." });
        }

        if (dto.Title.Trim().Length > BlogPost.MaxTitleLength)
            return BadRequest(new { message = $"Başlık en fazla {BlogPost.MaxTitleLength} karakter olabilir." });

        if (dto.Body.Trim().Length > BlogPost.MaxBodyLength)
            return BadRequest(new { message = $"İçerik en fazla {BlogPost.MaxBodyLength} karakter olabilir." });

        if (dto.Excerpt is { Length: > BlogPost.MaxExcerptLength })
            return BadRequest(new { message = $"Özet en fazla {BlogPost.MaxExcerptLength} karakter olabilir." });

        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal == null)
            return Unauthorized(new { message = "Yazı göndermek için giriş yapmalısınız." });

        var authorId = principal.UserId;
        if (!await db.Users.AnyAsync(u => u.Id == authorId, ct))
            return Unauthorized(new { message = "Oturum geçersiz. Lütfen tekrar giriş yapın." });

        string coverUrl = "/blog_backgrounds/parfum-dunyasinda-2026-sonbahari.webp";
        if (!string.IsNullOrWhiteSpace(dto.CoverImageUrl))
        {
            var normalizedCover = await imageWebp.NormalizeBlogImageAsync(dto.CoverImageUrl, ct);
            if (normalizedCover is null)
                return BadRequest(new { message = "Geçersiz kapak görseli. Lütfen geçerli bir görsel yükleyin veya WebP görsel adresi girin." });
            coverUrl = normalizedCover;
        }

        var normalizedBody = await imageWebp.NormalizeMarkdownImagesAsync(dto.Body.Trim(), ct);
        var slug = Domain.SlugHelper.Slugify(dto.Title) + "-" + DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

        var newPost = new BlogPost
        {
            AuthorUserId = authorId,
            Title = dto.Title.Trim(),
            Slug = slug,
            Body = normalizedBody,
            Excerpt = dto.Excerpt ?? (normalizedBody.Length > 150 ? normalizedBody[..150] + "..." : normalizedBody),
            CoverImageUrl = coverUrl,
            Status = BlogPostStatus.Pending, // Admin onayı bekleyecek
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        db.BlogPosts.Add(newPost);
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Yazınız başarıyla gönderildi ve admin onayına sunuldu!",
            post = new
            {
                newPost.Id,
                newPost.Title,
                newPost.Slug,
                newPost.Status
            }
        });
    }

    // ------------------------------------------------------------ moderasyon

    /// <summary>Onay bekleyen yazılar (yalnızca admin).</summary>
    [HttpGet("pending")]
    [RequireAdmin]
    public async Task<IActionResult> GetPendingBlogs(CancellationToken ct)
    {
        var posts = await db.BlogPosts
            .AsNoTracking()
            .Where(b => b.Status == BlogPostStatus.Pending)
            .OrderBy(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.Body,
                b.CoverImageUrl,
                b.CreatedAt,
                AuthorName = b.Author.DisplayName ?? b.Author.Email
            })
            .ToListAsync(ct);

        return Ok(posts);
    }

    /// <summary>Bekleyen yazıyı yayına alır (yalnızca admin).</summary>
    [HttpPost("{id:int}/approve")]
    [RequireAdmin]
    public Task<IActionResult> ApproveBlog(int id, CancellationToken ct) =>
        ModerateAsync(id, BlogPostStatus.Published, "Yazı yayına alındı.", ct);

    /// <summary>Bekleyen yazıyı reddeder (yalnızca admin).</summary>
    [HttpPost("{id:int}/reject")]
    [RequireAdmin]
    public Task<IActionResult> RejectBlog(int id, CancellationToken ct) =>
        ModerateAsync(id, BlogPostStatus.Rejected, "Yazı reddedildi.", ct);

    private async Task<IActionResult> ModerateAsync(int id, BlogPostStatus status, string message, CancellationToken ct)
    {
        var post = await db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (post == null)
            return NotFound(new { message = "Yazı bulunamadı." });

        post.Status = status;
        post.UpdatedAt = DateTimeOffset.UtcNow;
        if (status == BlogPostStatus.Published)
            post.PublishedAt ??= DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(new { message, post = new { post.Id, post.Slug, Status = post.Status.ToString() } });
    }
}
