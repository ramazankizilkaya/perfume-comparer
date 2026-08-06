using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;

namespace PerfumeComparer.Business.Services;

public interface ICatalogService
{
    Task<PerfumeDetailDto?> GetPerfumeDetailAsync(string slug, CancellationToken ct = default);
    Task<PagedResult<PerfumeCardDto>> GetPerfumesAsync(PerfumeListQuery query, CancellationToken ct = default);
    /// <summary>Marka rehberi kartları: logo, ad, ülke ve parfüm sayısı.</summary>
    Task<IReadOnlyList<BrandCardDto>> GetBrandsAsync(CancellationToken ct = default);
    Task<BrandDetailDto?> GetBrandDetailAsync(string slug, CancellationToken ct = default);
    Task<FilterMetaDto> GetFilterMetaAsync(CancellationToken ct = default);
}
