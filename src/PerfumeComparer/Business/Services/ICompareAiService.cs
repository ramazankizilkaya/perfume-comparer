using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Services;

public interface ICompareAiService
{
    Task<string?> GetOrGenerateComparisonAnalysisAsync(string p1Slug, string p2Slug, CancellationToken ct = default);
}
