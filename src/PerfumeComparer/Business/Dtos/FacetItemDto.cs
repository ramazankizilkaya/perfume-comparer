namespace PerfumeComparer.Business.Dtos;

/// <summary>Hızlı filtre butonu: etiket, slug ve kaç parfümü kapsadığı.</summary>
public record FacetItemDto(string Name, string Slug, int Count);
