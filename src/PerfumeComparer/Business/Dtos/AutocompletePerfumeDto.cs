namespace PerfumeComparer.Business.Dtos;

public record AutocompletePerfumeDto(
    string Name,
    string BrandName,
    string Slug,
    string? ImageUrl,
    string Gender,
    /// <summary>SEO yolu, /parfum/ öneki olmadan.</summary>
    string Path);
