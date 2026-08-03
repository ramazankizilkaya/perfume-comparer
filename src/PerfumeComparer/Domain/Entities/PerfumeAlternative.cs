using System;

namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// İki bağımsız parfüm arasındaki benzerlik ilişkisi.
/// <see cref="Kind"/> ilişkinin ne anlama geldiğini söyler:
/// "bana bunu hatırlatıyor" ya da "bunu sevenler şunu da sever".
/// </summary>
public class PerfumeAlternative
{
    /// <summary>İlişkinin başladığı parfüm (detay sayfası bu parfüme ait).</summary>
    public int SourcePerfumeId { get; set; }
    public Perfume SourcePerfume { get; set; } = null!;

    /// <summary>Benzer bulunan parfüm.</summary>
    public int TargetPerfumeId { get; set; }
    public Perfume TargetPerfume { get; set; } = null!;

    public PerfumeRelationKind Kind { get; set; }

    /// <summary>Kaynaktaki sıralama; 0 en üstteki öneri.</summary>
    public short SortOrder { get; set; }

    /// <summary>Benzerlik Oranı (%0 - %100)</summary>
    public byte? SimilarityRate { get; set; }

    /// <summary>Kullanıcı/Editör notu (Örn: "Açılışı daha narenciyeli, kurudukça birebir benziyor")</summary>
    public string? Note { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
