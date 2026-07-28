namespace PerfumeComparer.Domain.Entities;

public class PerfumeAgeGroup
{
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public AgeGroup AgeGroup { get; set; }

    /// <summary>Uygunluk skoru (0-100).</summary>
    public short Score { get; set; }
}
