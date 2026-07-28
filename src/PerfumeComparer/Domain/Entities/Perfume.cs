namespace PerfumeComparer.Domain.Entities;

public class Perfume
{
    public int Id { get; set; }
    public int BrandId { get; set; }
    public Brand Brand { get; set; } = null!;
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public Gender Gender { get; set; }
    public Concentration? Concentration { get; set; }
    public FragranceFamily? FragranceFamily { get; set; }
    public int? ReleaseYear { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }

    // Denormalize alanlar; rating değişince güncellenir (SEO'daki AggregateRating için)
    public decimal AvgRating { get; set; }
    public int RatingCount { get; set; }

    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<PerfumeNote> Notes { get; set; } = [];
    public List<PerfumeSeason> Seasons { get; set; } = [];
    public List<PerfumeAgeGroup> AgeGroups { get; set; } = [];

    public List<PerfumeDupe> Dupes { get; set; } = [];
    public List<PerfumeAlternative> AlternativesAsSource { get; set; } = [];
    public List<PerfumeAlternative> AlternativesAsTarget { get; set; } = [];
}
