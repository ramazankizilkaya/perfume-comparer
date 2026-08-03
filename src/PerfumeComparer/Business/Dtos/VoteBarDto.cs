namespace PerfumeComparer.Business.Dtos;

/// <summary>
/// Bir oylama seçeneği: kaç oy aldığı ve o oylamanın toplamı içindeki yüzdesi.
/// Kalıcılık, yayılım, cinsiyet ve fiyat oylamaları bu şekilde döner.
/// </summary>
public record VoteBarDto(string Name, string Slug, int Votes, short Percent);
