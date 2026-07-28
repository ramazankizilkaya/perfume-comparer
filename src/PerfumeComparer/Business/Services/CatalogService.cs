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

public class CatalogService(IUnitOfWork uow) : ICatalogService
{
    private const int MaxPageSize = 50;

    public async Task<PerfumeDetailDto?> GetPerfumeDetailAsync(string slug, CancellationToken ct = default)
    {
        var perfumeRepo = uow.GetRepository<Perfume>();

        var perfume = await perfumeRepo
            .AsNoTracking()
            .AsSplitQuery()
            .Where(p => p.Slug == slug && p.IsPublished)
            .Include(p => p.Brand)
            .Include(p => p.Notes)
            .Include(p => p.Seasons)
            .Include(p => p.AgeGroups)
            .Include(p => p.Dupes.Where(d => d.IsActive)).ThenInclude(d => d.DupeBrand)
            .Include(p => p.AlternativesAsTarget).ThenInclude(a => a.SourcePerfume).ThenInclude(sp => sp.Brand)
            .FirstOrDefaultAsync(ct);

        return perfume is null ? null : MapDetail(perfume);
    }

    public async Task<PagedResult<PerfumeCardDto>> GetPerfumesAsync(PerfumeListQuery q, CancellationToken ct = default)
    {
        var perfumeRepo = uow.GetRepository<Perfume>();
        var query = perfumeRepo.AsNoTracking().Where(p => p.IsPublished);

        if (!string.IsNullOrWhiteSpace(q.Q))
        {
            foreach (var term in q.Q.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var pat = $"%{term}%";
                query = query.Where(p => EF.Functions.ILike(p.Name, pat) || EF.Functions.ILike(p.Brand.Name, pat));
            }
        }

        var genders = ParseGenders(q.Gender);
        if (genders.Count > 0)
            query = query.Where(p => genders.Contains(p.Gender));

        if (Split(q.Brand) is { } brandSlugs)
            query = query.Where(p => brandSlugs.Contains(p.Brand.Slug));

        if (ParseEnums(q.Concentration, Lookups.ConcentrationFromSlug) is { Length: > 0 } concs)
            query = query.Where(p => p.Concentration != null && concs.Contains(p.Concentration.Value));

        if (ParseEnums(q.Family, Lookups.FamilyFromSlug) is { Length: > 0 } fams)
            query = query.Where(p => p.FragranceFamily != null && fams.Contains(p.FragranceFamily.Value));

        if (ParseEnums(q.Note, Lookups.NoteFromSlug) is { Length: > 0 } notes)
            query = query.Where(p => p.Notes.Any(n => notes.Contains(n.Note)));

        if (ParseEnums(q.Season, Lookups.SeasonFromSlug) is { Length: > 0 } seasons)
            query = query.Where(p => p.Seasons.Any(s => seasons.Contains(s.Season)));

        if (ParseEnums(q.AgeGroup, Lookups.AgeGroupFromSlug) is { Length: > 0 } ages)
            query = query.Where(p => p.AgeGroups.Any(a => ages.Contains(a.AgeGroup)));

        if (q.MinYear is { } minYear)
            query = query.Where(p => p.ReleaseYear >= minYear);

        if (q.MaxYear is { } maxYear)
            query = query.Where(p => p.ReleaseYear <= maxYear);

        if (q.MinRating is { } minRating)
            query = query.Where(p => p.AvgRating >= minRating);

        query = q.Sort switch
        {
            "rating" => query.OrderByDescending(p => p.AvgRating).ThenByDescending(p => p.RatingCount),
            "newest" => query.OrderByDescending(p => p.ReleaseYear),
            "name" => query.OrderBy(p => p.Name),
            _ => query.OrderByDescending(p => p.RatingCount).ThenByDescending(p => p.AvgRating).ThenBy(p => p.Name),
        };

        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, MaxPageSize);

        var totalCount = await query.CountAsync(ct);

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PerfumeCardRow(
                p.Name, p.Slug, p.Brand.Name, p.Brand.Slug, p.Gender,
                p.Concentration, p.FragranceFamily,
                p.ImageUrl, p.AvgRating, p.RatingCount))
            .ToListAsync(ct);

        return new PagedResult<PerfumeCardDto>(rows.Select(ToCard).ToList(), page, pageSize, totalCount);
    }

    public async Task<IReadOnlyList<RefItemDto>> GetBrandsAsync(CancellationToken ct = default)
    {
        var brandRepo = uow.GetRepository<Brand>();
        return await brandRepo
            .AsNoTracking()
            .OrderBy(b => b.Name)
            .Select(b => new RefItemDto(b.Id, b.Name, b.Slug))
            .ToListAsync(ct);
    }

    public async Task<BrandDetailDto?> GetBrandDetailAsync(string slug, CancellationToken ct = default)
    {
        var brandRepo = uow.GetRepository<Brand>();

        var brand = await brandRepo
            .AsNoTracking()
            .Where(b => b.Slug == slug)
            .Select(b => new { b.Name, b.Slug, b.Country, b.Description, b.LogoUrl })
            .FirstOrDefaultAsync(ct);

        if (brand is null)
            return null;

        var perfumeRepo = uow.GetRepository<Perfume>();
        var rows = await perfumeRepo
            .AsNoTracking()
            .Where(p => p.IsPublished && p.Brand.Slug == slug)
            .OrderByDescending(p => p.RatingCount)
            .Select(p => new PerfumeCardRow(
                p.Name, p.Slug, p.Brand.Name, p.Brand.Slug, p.Gender,
                p.Concentration, p.FragranceFamily,
                p.ImageUrl, p.AvgRating, p.RatingCount))
            .ToListAsync(ct);

        return new BrandDetailDto(
            brand.Name, brand.Slug, brand.Country, brand.Description, brand.LogoUrl,
            rows.Select(ToCard).ToList());
    }

    /// <summary>EF projeksiyonundan gelen ham kart satırı; etiket/slug/yol bellekte hesaplanır.</summary>
    private sealed record PerfumeCardRow(
        string Name, string Slug, string BrandName, string BrandSlug, Gender Gender,
        Concentration? Concentration, FragranceFamily? Family,
        string? ImageUrl, decimal AvgRating, int RatingCount);

    private static PerfumeCardDto ToCard(PerfumeCardRow r) => new(
        r.Name, r.Slug, new BrandRefDto(r.BrandName, r.BrandSlug),
        r.Gender.ToString(), r.Concentration?.Label(), r.Family?.Label(), r.Family?.Slug(),
        r.ImageUrl, r.AvgRating, r.RatingCount,
        PerfumeUrl.Path(r.Gender, r.Concentration?.Slug(), r.BrandSlug, r.Slug));

    public async Task<FilterMetaDto> GetFilterMetaAsync(CancellationToken ct = default)
    {
        var brandRepo = uow.GetRepository<Brand>();

        var brands = await brandRepo.AsNoTracking().OrderBy(b => b.Name)
            .Select(b => new RefItemDto(b.Id, b.Name, b.Slug)).ToListAsync(ct);

        // Nota, konsantrasyon, aile, mevsim ve yaş grubu enum → doğrudan koddan üretilir.
        return new FilterMetaDto(
            brands,
            Enum.GetValues<Concentration>().Select(c => new RefItemDto((int)c, c.Label(), c.Slug())).ToList(),
            Enum.GetValues<FragranceFamily>().Select(f => new RefItemDto((int)f, f.Label(), f.Slug())).ToList(),
            Enum.GetValues<Note>().Select(n => new NoteDto(n.Label(), n.Slug(), n.Category()))
                .OrderBy(n => n.Name, StringComparer.Create(System.Globalization.CultureInfo.GetCultureInfo("tr-TR"), true)).ToList(),
            Enum.GetValues<Season>().Select(s => new RefItemDto((int)s, s.Label(), s.Slug())).ToList(),
            Enum.GetValues<AgeGroup>().Select(a => new RefItemDto((int)a, a.Label(), a.Slug())).ToList(),
            Enum.GetNames<Gender>().ToList());
    }

    private static PerfumeDetailDto MapDetail(Perfume perfume)
    {
        List<NoteDto> NotesOf(NoteLayer layer) => perfume.Notes
            .Where(n => n.Layer == layer)
            .Select(n => new NoteDto(n.Note.Label(), n.Note.Slug(), n.Note.Category()))
            .ToList();

        var genderLabel = PerfumeUrl.GenderLabel(perfume.Gender);
        var breadcrumb = new List<BreadcrumbItemDto>
        {
            new("home", "Anasayfa", ""),
            new("gender", genderLabel, PerfumeUrl.GenderSlug(perfume.Gender)),
        };
        if (perfume.Concentration is { } conc)
            breadcrumb.Add(new("concentration", conc.Label(), conc.Slug()));
        breadcrumb.Add(new("brand", perfume.Brand.Name, perfume.Brand.Slug));
        breadcrumb.Add(new("perfume", perfume.Name, perfume.Slug));

        return new PerfumeDetailDto(
            perfume.Name,
            perfume.Slug,
            new BrandRefDto(perfume.Brand.Name, perfume.Brand.Slug),
            perfume.Gender.ToString(),
            perfume.Concentration?.Label(),
            perfume.Concentration?.Slug(),
            perfume.FragranceFamily?.Label(),
            perfume.FragranceFamily?.Slug(),
            perfume.FragranceFamily?.Description(),
            perfume.ReleaseYear,
            perfume.Description,
            perfume.ImageUrl,
            perfume.AvgRating,
            perfume.RatingCount,
            new NotePyramidDto(NotesOf(NoteLayer.Top), NotesOf(NoteLayer.Middle), NotesOf(NoteLayer.Base)),
            perfume.Seasons
                .OrderBy(s => (int)s.Season)
                .Select(s => new ScoredRefDto(s.Season.Label(), s.Season.Slug(), s.Score)).ToList(),
            perfume.AgeGroups
                .OrderBy(a => (int)a.AgeGroup)
                .Select(a => new ScoredRefDto(a.AgeGroup.Label(), a.AgeGroup.Slug(), a.Score)).ToList(),
            breadcrumb,
            perfume.Dupes
                .Where(d => d.IsActive)
                .Select(d => new PerfumeDupeDto(
                    d.Id,
                    d.DupeBrand.Name,
                    d.DupeBrand.Slug,
                    d.DupeBrand.OfficialUrl,
                    d.ProductCode,
                    d.Url,
                    d.SimilarityRate))
                .ToList(),
            perfume.AlternativesAsTarget
                .Select(a => new PerfumeAlternativeDto(
                    a.SourcePerfume.Name,
                    a.SourcePerfume.Slug,
                    new BrandRefDto(a.SourcePerfume.Brand.Name, a.SourcePerfume.Brand.Slug),
                    a.SourcePerfume.ImageUrl,
                    a.SimilarityRate,
                    a.Note,
                    PerfumeUrl.Path(a.SourcePerfume.Gender, a.SourcePerfume.Concentration?.Slug(), a.SourcePerfume.Brand.Slug, a.SourcePerfume.Slug)))
                .ToList(),
            PerfumeUrl.Path(perfume.Gender, perfume.Concentration?.Slug(), perfume.Brand.Slug, perfume.Slug));
    }

    private static string[]? Split(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    /// <summary>Virgüllü slug listesini enum dizisine çevirir (tanınmayanları atar).</summary>
    private static TEnum[] ParseEnums<TEnum>(string? csv, Func<string?, TEnum?> parse) where TEnum : struct =>
        Split(csv) is { } parts
            ? parts.Select(parse).Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToArray()
            : [];

    private static Gender? ParseGender(string? value) => value?.ToLowerInvariant() switch
    {
        "erkek" or "male" => Gender.Male,
        "kadin" or "kadın" or "female" => Gender.Female,
        "unisex" => Gender.Unisex,
        _ => null,
    };

    private static List<Gender> ParseGenders(string? value)
    {
        var result = new List<Gender>();
        if (string.IsNullOrWhiteSpace(value)) return result;
        foreach (var part in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            if (ParseGender(part) is { } g && !result.Contains(g))
                result.Add(g);
        return result;
    }
}
