using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record BrandDetailDto(
    string Name,
    string Slug,
    string? Country,
    string? Description,
    string? LogoUrl,
    List<PerfumeCardDto> Perfumes);
