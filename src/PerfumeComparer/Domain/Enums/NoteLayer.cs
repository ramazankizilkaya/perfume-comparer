namespace PerfumeComparer.Domain;

/// <summary>
/// Koku piramidi katmanı. Markası piramit yayımlamayan parfümlerde
/// (veri setinin ~%32'si) tek düz liste gelir; o notalar <see cref="All"/> olur.
/// </summary>
public enum NoteLayer
{
    Top,
    Middle,
    Base,
    All
}
