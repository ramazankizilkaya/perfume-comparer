using System;

namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// İki bağımsız parfüm arasındaki klon / alternatif parfüm ilişkisi.
/// Örn: Armaf Club de Nuit (Source) -> Creed Aventus (Target).
/// </summary>
public class PerfumeAlternative
{
    /// <summary>Klon/Alternatif olan parfüm (Örn: Armaf Club de Nuit)</summary>
    public int SourcePerfumeId { get; set; }
    public Perfume SourcePerfume { get; set; } = null!;

    /// <summary>Esinlenilen/Orijinal olan parfüm (Örn: Creed Aventus)</summary>
    public int TargetPerfumeId { get; set; }
    public Perfume TargetPerfume { get; set; } = null!;

    /// <summary>Benzerlik Oranı (%0 - %100)</summary>
    public byte? SimilarityRate { get; set; }

    /// <summary>Kullanıcı/Editör notu (Örn: "Açılışı daha narenciyeli, kurudukça birebir benziyor")</summary>
    public string? Note { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
