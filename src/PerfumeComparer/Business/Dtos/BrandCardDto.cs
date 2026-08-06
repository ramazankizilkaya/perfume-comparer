namespace PerfumeComparer.Business.Dtos;

/// <summary>Marka rehberindeki bir kart: logo, ad ve kaç parfümü olduğu.</summary>
public record BrandCardDto(
    int Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string? Country,
    int PerfumeCount);
