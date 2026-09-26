using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;

namespace PerfumeComparer.Business.Services;

/// <summary>Sitemap'e girecek yayındaki parfüm, marka ve blog adreslerini toplar.</summary>
public interface ISitemapService
{
    Task<SitemapDto> GetSitemapAsync(CancellationToken ct = default);
}
