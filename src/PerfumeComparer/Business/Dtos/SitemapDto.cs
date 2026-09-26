using System;
using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

/// <summary>
/// Sitemap için yayındaki tüm sayfaların adres bilgisi. Ön yüz bu listeyi
/// /sitemap.xml olarak yayınlar; burada yalnızca adres parçaları ve son değişiklik tarihi döner.
/// </summary>
public record SitemapDto(
    IReadOnlyList<SitemapPerfumeDto> Perfumes,
    IReadOnlyList<SitemapBrandDto> Brands,
    IReadOnlyList<SitemapBlogDto> Blogs);

/// <summary>Parfümün /parfum/ sonrası yolu (örn. "erkek/edp/dior/sauvage").</summary>
public record SitemapPerfumeDto(string Path, DateTimeOffset UpdatedAt);

/// <summary>Markanın son değişiklik tarihi, markadaki en son güncellenen parfümdür.</summary>
public record SitemapBrandDto(string Slug, DateTimeOffset UpdatedAt);

public record SitemapBlogDto(string Slug, DateTimeOffset UpdatedAt);
