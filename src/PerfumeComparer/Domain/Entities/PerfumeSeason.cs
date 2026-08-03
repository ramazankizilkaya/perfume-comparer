namespace PerfumeComparer.Domain.Entities;

public class PerfumeSeason
{
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public Season Season { get; set; }

    /// <summary>Bu mevsime verilen ham oy sayısı.</summary>
    public int Votes { get; set; }

    /// <summary>Parfümün en yüksek oy alan mevsimine göre normalize edilmiş skor (0-100).</summary>
    public short Score { get; set; }
}
