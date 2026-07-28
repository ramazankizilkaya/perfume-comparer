using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

public class SearchService(IUnitOfWork uow) : ISearchService
{
    private const int MaxPageSize = 50;

    public async Task<PagedResult<PerfumeCardDto>> SearchAsync(string q, int page, int pageSize, CancellationToken ct = default)
    {
        var term = q.Trim();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var rows = SearchRows(term);
        var totalCount = await rows.CountAsync(ct);
        var items = await rows
            .OrderByDescending(r => r.Score)
            .ThenByDescending(r => r.RatingCount)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var cards = items.Select(ToCard).ToList();

        return new PagedResult<PerfumeCardDto>(cards, page, pageSize, totalCount);
    }

    public async Task<AutocompleteDto> AutocompleteAsync(string q, CancellationToken ct = default)
    {
        var term = q?.Trim() ?? "";
        if (term.Length < ISearchService.MinQueryLength)
            return new AutocompleteDto([], [], []);

        var pattern = $"%{term}%";

        var perfumes = (await SearchRows(term)
                .OrderByDescending(r => r.Score)
                .ThenByDescending(r => r.RatingCount)
                .Take(8)
                .ToListAsync(ct))
            .Select(r => new AutocompletePerfumeDto(
                r.Name, r.BrandName, r.Slug, r.ImageUrl, r.Gender,
                PerfumeUrl.Path(r.Gender, ConcSlug(r.Concentration), r.BrandSlug, r.Slug)))
            .ToList();

        var brandRepo = uow.GetRepository<Brand>();

        var brands = await brandRepo.AsNoTracking()
            .Where(b => EF.Functions.ILike(EF.Functions.Unaccent(b.Name), EF.Functions.Unaccent(pattern))
                || EF.Functions.TrigramsSimilarity(EF.Functions.Unaccent(b.Name), EF.Functions.Unaccent(term)) > 0.3)
            .OrderByDescending(b => EF.Functions.TrigramsSimilarity(EF.Functions.Unaccent(b.Name), EF.Functions.Unaccent(term)))
            .Take(5)
            .Select(b => new AutocompleteItemDto(b.Name, b.Slug))
            .ToListAsync(ct);

        // Notalar artık enum: 16 kayıtlık sabit liste, bellekte eşleştiriliyor.
        var notes = Enum.GetValues<Note>()
            .Where(n => Fold(n.Label()).Contains(Fold(term), StringComparison.Ordinal))
            .Take(5)
            .Select(n => new AutocompleteItemDto(n.Label(), n.Slug()))
            .ToList();

        return new AutocompleteDto(perfumes, brands, notes);
    }

    /// <summary>Türkçe karakterleri sadeleştirip küçük harfe çevirir (aksan toleranslı arama için).</summary>
    private static string Fold(string value) => value
        .ToLowerInvariant()
        .Replace('ı', 'i').Replace('ğ', 'g').Replace('ü', 'u')
        .Replace('ş', 's').Replace('ö', 'o').Replace('ç', 'c');

    private static string? ConcSlug(string? enumName) =>
        Enum.TryParse<Concentration>(enumName, out var c) ? c.Slug() : null;

    private static PerfumeCardDto ToCard(PerfumeSearchRow r)
    {
        var conc = Enum.TryParse<Concentration>(r.Concentration, out var c) ? c : (Concentration?)null;
        var fam = Enum.TryParse<FragranceFamily>(r.FragranceFamily, out var f) ? f : (FragranceFamily?)null;
        return new(
            r.Name, r.Slug, new BrandRefDto(r.BrandName, r.BrandSlug),
            r.Gender, conc?.Label(), fam?.Label(), fam?.Slug(),
            r.ImageUrl, r.AvgRating, r.RatingCount,
            PerfumeUrl.Path(r.Gender, conc?.Slug(), r.BrandSlug, r.Slug));
    }

    private IQueryable<PerfumeSearchRow> SearchRows(string q) =>
        uow.SqlQuery<PerfumeSearchRow>($"""
            SELECT p.name, p.slug,
                   b.name AS brand_name, b.slug AS brand_slug,
                   p.gender, p.concentration AS concentration,
                   p.fragrance_family AS fragrance_family,
                   p.image_url, p.avg_rating, p.rating_count,
                   GREATEST(
                       similarity(f_unaccent(lower(p.name)), f_unaccent(lower({q}))),
                       similarity(f_unaccent(lower(b.name)), f_unaccent(lower({q}))),
                       word_similarity(f_unaccent(lower({q})), f_unaccent(lower(b.name || ' ' || p.name)))
                   )::float8 AS score
            FROM perfumes p
            JOIN brands b ON b.id = p.brand_id
            WHERE p.is_published AND (
                f_unaccent(lower(p.name)) LIKE '%' || f_unaccent(lower({q})) || '%'
                OR f_unaccent(lower(b.name)) LIKE '%' || f_unaccent(lower({q})) || '%'
                OR similarity(f_unaccent(lower(p.name)), f_unaccent(lower({q}))) >= 0.25
                OR similarity(f_unaccent(lower(b.name)), f_unaccent(lower({q}))) >= 0.3
                OR word_similarity(f_unaccent(lower({q})), f_unaccent(lower(b.name || ' ' || p.name))) >= 0.35
            )
            """);
}
