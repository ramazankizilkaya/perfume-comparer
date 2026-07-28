using System;

namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Orijinal parfüm ile muadil marka arasındaki ürün kodu ve satın alma bağlantısı.
/// </summary>
public class PerfumeDupe
{
    public int Id { get; set; }

    /// <summary>Hangi orijinal parfüme muadil?</summary>
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;

    /// <summary>Hangi muadil markanın ürünü?</summary>
    public int DupeBrandId { get; set; }
    public DupeBrand DupeBrand { get; set; } = null!;

    /// <summary>Muadil Ürün/Koku Kodu (Örn: "E101", "561", "C-120")</summary>
    public string? ProductCode { get; set; }

    /// <summary>Ürün doğrudan satın alma/detay linki</summary>
    public string? Url { get; set; }

    /// <summary>Benzerlik Oranı (%0 - %100)</summary>
    public byte? SimilarityRate { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
