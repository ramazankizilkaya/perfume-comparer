namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// Koku notası. Kaynak veride 1200'den fazla farklı nota olduğu için
/// enum değil tablo; içe aktarımda ada göre tekilleştirilir.
/// </summary>
public class Note
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }

    /// <summary>Görsel gruplama için nota ailesi ("Odunsu", "Narenciye"); bilinmiyorsa boş.</summary>
    public string? Category { get; set; }

    /// <summary>Kaç parfümde geçtiği; her içe aktarımda yeniden hesaplanır.</summary>
    public int PerfumeCount { get; set; }

    public List<PerfumeNote> Perfumes { get; set; } = [];
}
