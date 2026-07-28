namespace PerfumeComparer.Business.Dtos;

public record PerfumeDupeDto(
    int Id,
    string BrandName,
    string BrandSlug,
    string? OfficialUrl,
    string? ProductCode,
    string? Url,
    byte? SimilarityRate);
