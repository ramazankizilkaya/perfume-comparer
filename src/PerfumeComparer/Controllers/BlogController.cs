using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
[Route("api/blogs")]
public class BlogController(AppDbContext db, ITokenService tokens) : ControllerBase
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
            post.ViewCount,
            post.PublishedAt,
            AuthorName = post.Author.DisplayName ?? post.Author.Email,
            AuthorAvatar = post.Author.AvatarUrl
        });
    }

    public record CreateBlogPostDto(string Title, string Body, string? Excerpt, string? CoverImageUrl);

    [HttpPost]
    public async Task<IActionResult> CreateBlog([FromBody] CreateBlogPostDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
        {
            return BadRequest(new { message = "Başlık ve içerik alanları zorunludur." });
        }

        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        int authorId;
        if (principal != null)
        {
            authorId = (int)principal.UserId;
        }
        else
        {
            var author = await db.Users.FirstOrDefaultAsync(ct);
            if (author == null)
            {
                return BadRequest(new { message = "Yazar bulunamadı. Lütfen önce veritabanını tohumlayın veya giriş yapın." });
            }
            authorId = (int)author.Id;
        }

        var slug = Domain.SlugHelper.Slugify(dto.Title) + "-" + DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

        var newPost = new BlogPost
        {
            AuthorUserId = authorId,
            Title = dto.Title,
            Slug = slug,
            Body = dto.Body,
            Excerpt = dto.Excerpt ?? (dto.Body.Length > 150 ? dto.Body[..150] + "..." : dto.Body),
            CoverImageUrl = dto.CoverImageUrl ?? "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800",
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
}
