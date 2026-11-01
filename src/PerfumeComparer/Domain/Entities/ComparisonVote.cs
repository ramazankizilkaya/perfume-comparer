namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Bir karşılaştırmada "hangisini tercih ediyorsunuz?" oyu. Yorum yazmadan ve giriş
/// yapmadan verilebilir. Çift <see cref="ComparisonComment.NormalizePair"/> ile
/// normalize saklanır ki "A vs B" ile "B vs A" aynı oyları saysın.
/// Bir seçmen çift başına tek oy kullanır; fikrini değiştirirse kayıt güncellenir.
/// </summary>
public class ComparisonVote
{
    /// <summary>"u:{kullanıcı id}" ya da "a:{tarayıcının ürettiği anonim kimlik}" + ön ek.</summary>
    public const int MaxVoterKeyLength = 80;

    public int Id { get; set; }

    public int FirstPerfumeId { get; set; }
    public Perfume FirstPerfume { get; set; } = null!;

    public int SecondPerfumeId { get; set; }
    public Perfume SecondPerfume { get; set; } = null!;

    /// <summary>Çiftteki iki parfümden birinin id'si.</summary>
    public int PreferredPerfumeId { get; set; }

    /// <summary>Girişli kullanıcıda kullanıcı id'si, misafirde tarayıcı kimliği; tek oy bu anahtarla sağlanır.</summary>
    public required string VoterKey { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
