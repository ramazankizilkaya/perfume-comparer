using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;

namespace PerfumeComparer.Business.Services;

public interface ISearchService
{
    const int MinQueryLength = 2;

    Task<PagedResult<PerfumeCardDto>> SearchAsync(string q, int page, int pageSize, CancellationToken ct = default);
    Task<AutocompleteDto> AutocompleteAsync(string q, CancellationToken ct = default);
}
