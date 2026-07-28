namespace PerfumeComparer.Business.Dtos;

public record PerfumeCardDto(
    string Name,
    string Slug,
    BrandRefDto Brand,
    string Gender,
    string? Concentration,
    string? FragranceFamily,
    string? FragranceFamilySlug,
    string? ImageUrl,
    decimal AvgRating,
    int RatingCount,
    /// <summary>SEO yolu, /parfum/ öneki olmadan. Örn: erkek/edp/dior/dior-homme-edp</summary>
    string Path);
