using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Services;

public interface ICompareAiService
{
    /// <summary>Daha önce üretilip veritabanına yazılmış analiz; yoksa null (AI çağrısı yapmaz).</summary>
    Task<string?> GetCachedComparisonAnalysisAsync(string p1Slug, string p2Slug, CancellationToken ct = default);

    /// <summary>Analizi önbellekten döner, yoksa AI ile üretip kaydeder.</summary>
    Task<string?> GetOrGenerateComparisonAnalysisAsync(string p1Slug, string p2Slug, CancellationToken ct = default);
}
