namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Ana akor ("odunsu", "narenciye"). Kaynak veride yüz civarı farklı akor var,
/// bu yüzden enum değil tablo.
/// </summary>
public class Accord
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }

    /// <summary>Kaç parfümde geçtiği; her içe aktarımda yeniden hesaplanır.</summary>
    public int PerfumeCount { get; set; }

    public List<PerfumeAccord> Perfumes { get; set; } = [];
}
