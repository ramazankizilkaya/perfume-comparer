using System;

namespace PerfumeComparer.Business.Dtos;

public record PerfumeAdvisorRequest(
    string? Gender,
    string? LikedPerfumes,
    string? DislikedNotes,
    string? PreferredNotes,
    string? Occasion,
    string? Season,
    string? FreeText
);

public record RecommendedPerfumeDto(
    int Id,
    string Name,
    string Slug,
    string BrandName,
    string BrandSlug,
    string Gender,
    string? Concentration,
    string? ConcentrationSlug,
    string? FragranceFamily,
    string? FragranceFamilySlug,
    string? ImageUrl,
    string Path,
    decimal AvgRating,
    int RatingCount,
    string? TopAccord
);

public record PerfumeAdvisorResponse(
    bool Success,
    string? Message,
    bool HasUsedToday,
    RecommendedPerfumeDto? Perfume,
    string? PerfumerAdvice,
    DateTimeOffset? CreatedAt,
    DateTimeOffset? NextAvailableAt
);
