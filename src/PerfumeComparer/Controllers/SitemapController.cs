using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Services;

namespace PerfumeComparer.Controllers;

/// <summary>Ön yüzün /sitemap.xml dosyasını üretmek için kullandığı adres listesi.</summary>
[ApiController]
[Route("api/sitemap")]
public class SitemapController(ISitemapService sitemap) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSitemap(CancellationToken ct)
    {
        var result = await sitemap.GetSitemapAsync(ct);
        return Ok(result);
    }
}
