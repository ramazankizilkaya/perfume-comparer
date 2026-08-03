using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

/// <summary>
/// Marka sayfasının üst bloğu ve hızlı filtre butonları.
/// Parfüm listesi burada dönmez; sayfa <c>/api/perfumes?brand=slug</c> ile
/// sayfa sayfa (sonsuz kaydırma) yükler.
/// </summary>
public record BrandDetailDto(
    string Name,
    string Slug,
    string? Country,
    string? Description,
    string? LogoUrl,
    string? MainActivity,
    string? WebsiteUrl,
    string? ParentCompany,
    int PerfumeCount,
    int? FirstYear,
    int? LastYear,
    decimal AvgRating,
    List<FacetItemDto> Genders,
    List<FacetItemDto> Concentrations,
    List<FacetItemDto> Families,
    List<FacetItemDto> Accords);
