using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

public class SitemapService(IUnitOfWork uow, IMemoryCache cache) : ISitemapService
{
    private const string CacheKey = "sitemap";

    /// <summary>
    /// Liste 20 binden fazla satırdır ve arama motorları sitemap'i sık sık okur;
    /// bu yüzden sonuç bir saat bellekte tutulur. Yeni import en geç bir saat sonra görünür.
    /// </summary>
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

    public async Task<SitemapDto> GetSitemapAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue<SitemapDto>(CacheKey, out var cached) && cached is not null)
            return cached;

        var result = await BuildAsync(ct);
        cache.Set(CacheKey, result, CacheDuration);
        return result;
    }

    private async Task<SitemapDto> BuildAsync(CancellationToken ct)
    {
        // Yol (path) konsantrasyon ve cinsiyet slug'ından oluştuğu için bellekte kurulur;
        // veritabanından yalnızca gereken kolonlar çekilir.
        var perfumeRows = await uow.GetRepository<Perfume>()
            .AsNoTracking()
            .Where(p => p.IsPublished)
            .OrderBy(p => p.Id)
            .Select(p => new { p.Gender, p.Concentration, BrandSlug = p.Brand.Slug, p.Slug, p.UpdatedAt })
            .ToListAsync(ct);

        var perfumes = perfumeRows
            .Select(r => new SitemapPerfumeDto(
                PerfumeUrl.Path(r.Gender, r.Concentration?.Slug(), r.BrandSlug, r.Slug),
                r.UpdatedAt))
            .ToList();

        // Parfümü olmayan marka sayfası boştur; sitemap'e alınmaz.
        var brands = await uow.GetRepository<Brand>()
            .AsNoTracking()
            .Where(b => b.Perfumes.Any(p => p.IsPublished))
            .OrderBy(b => b.Slug)
            .Select(b => new SitemapBrandDto(
                b.Slug,
                b.Perfumes.Where(p => p.IsPublished).Max(p => p.UpdatedAt)))
            .ToListAsync(ct);

        var blogs = await uow.GetRepository<BlogPost>()
            .AsNoTracking()
            .Where(b => b.Status == BlogPostStatus.Published)
            .OrderByDescending(b => b.PublishedAt)
            .Select(b => new SitemapBlogDto(b.Slug, b.UpdatedAt))
            .ToListAsync(ct);

        return new SitemapDto(perfumes, brands, blogs);
    }
}
