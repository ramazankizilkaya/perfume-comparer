namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Yaş grubu dağılımı. Kaynak veride yok; "Bu parfümü kullanıyorum" butonuyla
/// site kullanıcıları doldurur. <see cref="PerfumeUsage"/> kayıtlarının özeti.
/// </summary>
public class PerfumeAgeGroup
{
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public AgeGroup AgeGroup { get; set; }

    /// <summary>Bu yaş grubundan gelen "kullanıyorum" sayısı.</summary>
    public int Votes { get; set; }
}
