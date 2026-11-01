using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;

namespace PerfumeComparer.Business.Services;

public interface IPerfumeAdvisorService
{
    Task<PerfumeAdvisorResponse> GetStatusAsync(int userId, CancellationToken ct = default);
    Task<PerfumeAdvisorResponse> RecommendAsync(int userId, PerfumeAdvisorRequest request, CancellationToken ct = default);
}
