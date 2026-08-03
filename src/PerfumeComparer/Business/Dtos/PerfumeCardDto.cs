namespace PerfumeComparer.Business.Dtos;

public record PerfumeCardDto(
    string Name,
    string Slug,
    BrandRefDto Brand,
    string Gender,
    string? Concentration,
    string? FragranceFamily,
    string? FragranceFamilySlug,
    int? ReleaseYear,
    string? ImageUrl,
    decimal AvgRating,
    int RatingCount,
    /// <summary>En baskın üç ana akor; kartta etiket olarak gösterilir.</summary>
    List<string> Accords,
    /// <summary>SEO yolu, /parfum/ öneki olmadan. Örn: erkek/edp/dior/dior-homme-edp</summary>
    string Path);
