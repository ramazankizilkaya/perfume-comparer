namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Bir karşılaştırma (iki parfüm) hakkında yazılan yorum.
/// Çift daima normalize edilir (Perfume1Id &lt; Perfume2Id) ki
/// "A vs B" ile "B vs A" aynı tartışmayı göstersin.
/// Parfüm yorumlarında olduğu gibi AI özetleri de burada durur
/// (<see cref="IsAiSummary"/>), sadece promptu farklıdır.
/// </summary>
public class ComparisonComment
{
    public int Id { get; set; }

    public int Perfume1Id { get; set; }
    public Perfume Perfume1 { get; set; } = null!;

    public int Perfume2Id { get; set; }
    public Perfume Perfume2 { get; set; } = null!;

    /// <summary>AI özetlerinde boş.</summary>
    public int? UserId { get; set; }
    public AppUser? User { get; set; }

    public required string Body { get; set; }

    /// <summary>Yorum sahibinin hangi parfümü tercih ettiği (opsiyonel oy).</summary>
    public int? PreferredPerfumeId { get; set; }

    /// <summary>Arka plan işi tarafından yorumlardan üretilen özet mi?</summary>
    public bool IsAiSummary { get; set; }

    /// <summary>AI özeti üretilirken kaç yorum vardı; yeniden üretim eşiği için.</summary>
    public int? SourceCommentCount { get; set; }

    public ModerationStatus Status { get; set; } = ModerationStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    /// <summary>Verilen iki id'yi normalize sıraya sokar.</summary>
    public static (int First, int Second) NormalizePair(int a, int b) =>
        a <= b ? (a, b) : (b, a);
}
