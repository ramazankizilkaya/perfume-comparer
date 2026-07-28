namespace PerfumeComparer.Domain.Entities;

public class PerfumeSeason
{
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public Season Season { get; set; }

    /// <summary>Uygunluk skoru (0-100).</summary>
    public short Score { get; set; }
}
