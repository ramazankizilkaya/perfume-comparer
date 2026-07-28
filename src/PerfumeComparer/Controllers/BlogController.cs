using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
public class BlogController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetBlogs(CancellationToken ct)
    {
        var posts = await db.BlogPosts
            .AsNoTracking()
            .Where(b => b.Status == BlogPostStatus.Published)
            .OrderByDescending(b => b.PublishedAt)
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.CoverImageUrl,
                b.PublishedAt,
                AuthorName = b.Author.DisplayName ?? b.Author.Email
            })
            .ToListAsync(ct);

        return Ok(posts);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBlogDetail(string slug, CancellationToken ct)
    {
        var post = await db.BlogPosts
            .AsNoTracking()
            .Include(b => b.Author)
            .Where(b => b.Slug == slug && b.Status == BlogPostStatus.Published)
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.Slug,
                b.Body,
                b.Excerpt,
                b.CoverImageUrl,
                b.PublishedAt,
                AuthorName = b.Author.DisplayName ?? b.Author.Email,
                AuthorAvatar = b.Author.AvatarUrl
            })
            .FirstOrDefaultAsync(ct);

        return post != null ? Ok(post) : NotFound();
    }

    public record CreateBlogPostDto(string Title, string Body, string? Excerpt, string? CoverImageUrl);

    [HttpPost]
    public async Task<IActionResult> CreateBlog([FromBody] CreateBlogPostDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
        {
            return BadRequest("Başlık ve içerik alanları zorunludur.");
        }

        // Simüle etmek için ilk kullanıcıyı yazar yapalım
        var author = await db.Users.FirstOrDefaultAsync(ct);
        if (author == null)
        {
            return BadRequest("Yazar bulunamadı. Lütfen önce veritabanını tohumlayın.");
        }

        var slug = Domain.SlugHelper.Slugify(dto.Title) + "-" + DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

        var newPost = new BlogPost
        {
            AuthorUserId = author.Id,
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
