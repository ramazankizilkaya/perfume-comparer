namespace PerfumeComparer.Domain.Entities;

public class PerfumeNote
{
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;

    public int NoteId { get; set; }
    public Note Note { get; set; } = null!;

    public NoteLayer Layer { get; set; }

    /// <summary>Katman içindeki sıra; kaynaktaki listeleme sırasını korur.</summary>
    public short SortOrder { get; set; }
}
