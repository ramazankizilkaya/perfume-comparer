namespace PerfumeComparer.Domain.Entities;

public class PerfumeNote
{
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;

    /// <summary>Nota artık enum; ayrı bir lookup tablosu yok.</summary>
    public Note Note { get; set; }

    public NoteLayer Layer { get; set; }
}
