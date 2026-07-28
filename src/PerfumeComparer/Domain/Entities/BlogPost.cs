namespace PerfumeComparer.Domain.Entities;

public class BlogPost
{
    public int Id { get; set; }
    public int AuthorUserId { get; set; }
    public AppUser Author { get; set; } = null!;
    public required string Title { get; set; }
    public required string Slug { get; set; }
    public required string Body { get; set; }
    public string? Excerpt { get; set; }
    public string? CoverImageUrl { get; set; }
    public BlogPostStatus Status { get; set; } = BlogPostStatus.Draft;
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
