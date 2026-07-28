namespace PerfumeComparer.Domain.Entities;

public class Brand
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? Country { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<Perfume> Perfumes { get; set; } = [];
}
