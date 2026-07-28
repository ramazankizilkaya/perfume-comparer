namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Bir parfüm hakkındaki yorum. Kullanıcı yorumları ve AI özetleri aynı tabloda
/// durur; <see cref="IsAiSummary"/> ikisini ayırır (AI özetinin yazarı yoktur).
/// </summary>
public class PerfumeComment
{
    public int Id { get; set; }
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;

    /// <summary>AI özetlerinde boş.</summary>
    public int? UserId { get; set; }
    public AppUser? User { get; set; }

    public required string Body { get; set; }

    /// <summary>Arka plan işi tarafından yorumlardan üretilen özet mi?</summary>
    public bool IsAiSummary { get; set; }

    /// <summary>AI özeti üretilirken kaç yorum vardı; yeniden üretim eşiği için.</summary>
    public int? SourceCommentCount { get; set; }

    public ModerationStatus Status { get; set; } = ModerationStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
