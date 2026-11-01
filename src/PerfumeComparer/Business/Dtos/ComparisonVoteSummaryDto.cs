using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

/// <summary>Karşılaştırmadaki bir parfümün aldığı tercih oyu ve toplam içindeki yüzdesi.</summary>
public record ComparisonVoteOptionDto(string Slug, int Votes, int Percent);

/// <summary>
/// Bir karşılaştırmanın tercih oyları. <c>Options</c> her zaman iki parfümü de içerir
/// (oy almayanda 0). <c>MyVote</c> isteği yapan seçmenin oyunun parfüm slug'ıdır, oy vermediyse boştur.
/// </summary>
public record ComparisonVoteSummaryDto(int Total, string? MyVote, List<ComparisonVoteOptionDto> Options);
