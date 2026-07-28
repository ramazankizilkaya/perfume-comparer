using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Yorumları özetleyen AI servisi. Arka plan işi bunu çağırır; anahtar
/// tanımlı değilse <see cref="IsEnabled"/> false döner ve iş atlanır.
/// </summary>
public interface IAiSummaryClient
{
    bool IsEnabled { get; }

    /// <summary>Bir parfümün kullanıcı yorumlarını tek paragraflık özete çevirir.</summary>
    Task<string?> SummarizePerfumeAsync(
        string perfumeName, string brandName, IReadOnlyList<string> comments, CancellationToken ct = default);

    /// <summary>İki parfüm karşılaştırması hakkındaki yorumları özetler (farklı prompt).</summary>
    Task<string?> SummarizeComparisonAsync(
        string perfume1, string perfume2, IReadOnlyList<string> comments, CancellationToken ct = default);
}
