using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record PerfumeDetailDto(
    string Name,
    string Slug,
    BrandRefDto Brand,
    string Gender,
    string? Concentration,
    string? ConcentrationSlug,
    string? FragranceFamily,
    string? FragranceFamilySlug,
    string? FragranceFamilyDescription,
    int? ReleaseYear,
    string? Description,
    string? ImageUrl,
    decimal AvgRating,
    int RatingCount,
    NotePyramidDto Notes,
    List<ScoredRefDto> Seasons,
    List<ScoredRefDto> AgeGroups,
    List<BreadcrumbItemDto> Breadcrumb,
    List<PerfumeDupeDto> Dupes,
    List<PerfumeAlternativeDto> Alternatives,
    /// <summary>SEO yolu, /parfum/ öneki olmadan.</summary>
    string Path);
