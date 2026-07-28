using System;
using System.Collections.Generic;

namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Muadil parfüm markası (Örn: MAD Parfüm, Bargello, Muscent).
/// </summary>
public class DupeBrand
{
    public int Id { get; set; }

    /// <summary>Marka Adı (Örn: "MAD Parfüm", "Bargello")</summary>
    public required string Name { get; set; }

    /// <summary>SEO URL Slug'ı (Örn: "mad-parfum", "bargello")</summary>
    public required string Slug { get; set; }

    /// <summary>Resmi Web Sitesi (Örn: "https://www.bargello.com.tr")</summary>
    public string? OfficialUrl { get; set; }

    /// <summary>Marka Logosu URL'i</summary>
    public string? LogoUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<PerfumeDupe> Dupes { get; set; } = [];
}
