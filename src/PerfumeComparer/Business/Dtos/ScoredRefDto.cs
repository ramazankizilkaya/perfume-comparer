namespace PerfumeComparer.Business.Dtos;

/// <summary>Skorlu referans: 0-100 arası normalize skor ve arkasındaki ham oy sayısı.</summary>
public record ScoredRefDto(string Name, string Slug, short Score, int Votes);
