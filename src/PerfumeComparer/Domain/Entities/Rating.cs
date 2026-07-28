namespace PerfumeComparer.Domain.Entities;

/// <summary>Kullanıcı puanı. Yorumdan bağımsız verilebilir; kullanıcı başına parfüm başına tek kayıt.</summary>
public class Rating
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;

    /// <summary>1-5 arası puan.</summary>
    public short Score { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
