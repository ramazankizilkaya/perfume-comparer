namespace PerfumeComparer.Domain.Entities;

public class PerfumeAccord
{
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;

    public int AccordId { get; set; }
    public Accord Accord { get; set; } = null!;

    /// <summary>Akorun baskınlığı, yüzde olarak (0-100). Detay sayfasındaki barların uzunluğu.</summary>
    public decimal Width { get; set; }

    /// <summary>Baskınlık sırası; 0 en baskın akor.</summary>
    public short Rank { get; set; }
}
