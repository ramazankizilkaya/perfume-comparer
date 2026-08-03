namespace PerfumeComparer.Business.Dtos;

/// <summary>
/// Koku piramidi. Markası piramit yayımlamayan parfümlerde Top/Middle/Base boş
/// kalır ve bütün notalar <paramref name="All"/> içinde tek liste olarak gelir.
/// </summary>
public record NotePyramidDto(List<NoteDto> Top, List<NoteDto> Middle, List<NoteDto> Base, List<NoteDto> All);
