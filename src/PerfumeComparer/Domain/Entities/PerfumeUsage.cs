namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// "Bu parfümü kullanıyorum" kaydı. Girişli kullanıcıda parfüm başına tek kayıt
/// tutulur; misafirler için sadece anonim sayaç niteliğindedir.
/// </summary>
public class PerfumeUsage
{
    public int Id { get; set; }

    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;

    public int? UserId { get; set; }
    public AppUser? User { get; set; }

    public AgeGroup AgeGroup { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
