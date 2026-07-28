namespace PerfumeComparer.Business.Dtos;

public record PerfumeAlternativeDto(
    string PerfumeName,
    string PerfumeSlug,
    BrandRefDto Brand,
    string? ImageUrl,
    byte? SimilarityRate,
    string? Note,
    string Path);
