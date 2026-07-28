namespace PerfumeComparer.Business.Dtos;

/// <summary>Breadcrumb seviyesi: anasayfa > cinsiyet > tip > marka > parfüm.</summary>
public record BreadcrumbItemDto(string Level, string Label, string Slug);
