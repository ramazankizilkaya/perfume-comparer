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

    /// <summary>Kartta gösterilen ana akor sayısı.</summary>
    private const int CardAccordCount = 3;

    public async Task<PerfumeDetailDto?> GetPerfumeDetailAsync(string slug, CancellationToken ct = default)
    {
        var perfumeRepo = uow.GetRepository<Perfume>();

        var perfume = await perfumeRepo
            .AsNoTracking()
            .AsSplitQuery()
            .Where(p => p.Slug == slug && p.IsPublished)
            .Include(p => p.Brand)
            .Include(p => p.Notes).ThenInclude(n => n.Note)
            .Include(p => p.Accords).ThenInclude(a => a.Accord)
            .Include(p => p.Seasons)
            .Include(p => p.AgeGroups)
            .Include(p => p.Dupes.Where(d => d.IsActive)).ThenInclude(d => d.DupeBrand)
            .Include(p => p.AlternativesAsSource).ThenInclude(a => a.TargetPerfume).ThenInclude(tp => tp.Brand)
            .FirstOrDefaultAsync(ct);

        return perfume is null ? null : MapDetail(perfume);
    }

    public async Task<PagedResult<PerfumeCardDto>> GetPerfumesAsync(PerfumeListQuery q, CancellationToken ct = default)
    {
        var query = BuildListQuery(q);

        query = q.Sort switch
        {
            "rating" => query.OrderByDescending(p => p.AvgRating).ThenByDescending(p => p.RatingCount),
            "newest" => query.OrderByDescending(p => p.ReleaseYear).ThenByDescending(p => p.RatingCount),
            "oldest" => query.OrderBy(p => p.ReleaseYear).ThenByDescending(p => p.RatingCount),
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
                p.Concentration, p.FragranceFamily, p.ReleaseYear,
                p.ImageUrl, p.AvgRating, p.RatingCount,
                p.Accords.OrderBy(a => a.Rank).Take(CardAccordCount).Select(a => a.Accord.Name).ToList()))
            .ToListAsync(ct);

        return new PagedResult<PerfumeCardDto>(rows.Select(ToCard).ToList(), page, pageSize, totalCount);
    }

    public async Task<IReadOnlyList<BrandCardDto>> GetBrandsAsync(CancellationToken ct = default)
    {
        var brandRepo = uow.GetRepository<Brand>();
        return await brandRepo
            .AsNoTracking()
            .OrderBy(b => b.Name)
            .Select(b => new BrandCardDto(b.Id, b.Name, b.Slug, b.LogoUrl, b.Country, b.PerfumeCount))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Marka sayfasının başlık bloğu ve hızlı filtre butonları.
    /// Parfüm listesi burada dönmez; sayfa /api/perfumes?brand=slug ile sayfa sayfa yükler.
    /// </summary>
    public async Task<BrandDetailDto?> GetBrandDetailAsync(string slug, CancellationToken ct = default)
    {
        var brandRepo = uow.GetRepository<Brand>();

        var brand = await brandRepo
            .AsNoTracking()
            .Where(b => b.Slug == slug)
            .Select(b => new
            {
                b.Id, b.Name, b.Slug, b.Country, b.Description, b.LogoUrl,
                b.MainActivity, b.WebsiteUrl, b.ParentCompany,
            })
            .FirstOrDefaultAsync(ct);

        if (brand is null)
            return null;

        var perfumeRepo = uow.GetRepository<Perfume>();
        var perfumes = perfumeRepo.AsNoTracking().Where(p => p.IsPublished && p.BrandId == brand.Id);

        var summary = await perfumes
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                FirstYear = g.Min(p => p.ReleaseYear),
                LastYear = g.Max(p => p.ReleaseYear),
                // Oy sayısına göre ağırlıklı ortalama; tek oylu parfümler markayı yanıltmasın.
                // Toplam numeric(3,2)'ye sığmadığı için double üzerinden hesaplanır.
                VoteSum = g.Sum(p => (double)p.RatingCount),
                WeightedSum = g.Sum(p => (double)p.AvgRating * p.RatingCount),
            })
            .FirstOrDefaultAsync(ct);

        if (summary is null || summary.Count == 0)
        {
            return new BrandDetailDto(
                brand.Name, brand.Slug, brand.Country, brand.Description, brand.LogoUrl,
                brand.MainActivity, brand.WebsiteUrl, brand.ParentCompany,
                0, null, null, 0m, [], [], [], []);
        }

        var genderCounts = await perfumes
            .GroupBy(p => p.Gender)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var concentrationCounts = await perfumes
            .Where(p => p.Concentration != null)
            .GroupBy(p => p.Concentration!.Value)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var familyCounts = await perfumes
            .Where(p => p.FragranceFamily != null)
            .GroupBy(p => p.FragranceFamily!.Value)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var accordCounts = await uow.GetRepository<PerfumeAccord>().AsNoTracking()
            .Where(pa => pa.Perfume.IsPublished && pa.Perfume.BrandId == brand.Id)
            .GroupBy(pa => new { pa.Accord.Name, pa.Accord.Slug })
            .Select(g => new { g.Key.Name, g.Key.Slug, Count = g.Count() })
            .OrderByDescending(f => f.Count)
            .Take(12)
            .ToListAsync(ct);

        return new BrandDetailDto(
            brand.Name, brand.Slug, brand.Country, brand.Description, brand.LogoUrl,
            brand.MainActivity, brand.WebsiteUrl, brand.ParentCompany,
            summary.Count, summary.FirstYear, summary.LastYear,
            summary.VoteSum > 0 ? Math.Round((decimal)(summary.WeightedSum / summary.VoteSum), 2) : 0m,
            genderCounts
                .OrderByDescending(g => g.Count)
                .Select(g => new FacetItemDto(PerfumeUrl.GenderLabel(g.Key), PerfumeUrl.GenderSlug(g.Key), g.Count))
                .ToList(),
            concentrationCounts
                .OrderByDescending(c => c.Count)
                .Select(c => new FacetItemDto(c.Key.Label(), c.Key.Slug(), c.Count))
                .ToList(),
            familyCounts
                .OrderByDescending(f => f.Count)
                .Select(f => new FacetItemDto(f.Key.Label(), f.Key.Slug(), f.Count))
                .ToList(),
            accordCounts.Select(a => new FacetItemDto(a.Name, a.Slug, a.Count)).ToList());
    }

    public async Task<FilterMetaDto> GetFilterMetaAsync(CancellationToken ct = default)
    {
        var brands = await uow.GetRepository<Brand>().AsNoTracking().OrderBy(b => b.Name)
            .Select(b => new RefItemDto(b.Id, b.Name, b.Slug)).ToListAsync(ct);

        // Nota ve akor artık tablo: en yaygın olanlar filtre panelini besler.
        var notes = await uow.GetRepository<Note>().AsNoTracking()
            .OrderByDescending(n => n.PerfumeCount)
            .Take(200)
            .Select(n => new NoteDto(n.Name, n.Slug, n.Category))
            .ToListAsync(ct);

        var accords = await uow.GetRepository<Accord>().AsNoTracking()
            .OrderByDescending(a => a.PerfumeCount)
            .Take(60)
            .Select(a => new RefItemDto(a.Id, a.Name, a.Slug))
            .ToListAsync(ct);

        var turkish = StringComparer.Create(System.Globalization.CultureInfo.GetCultureInfo("tr-TR"), true);

        return new FilterMetaDto(
            brands,
            Enum.GetValues<Concentration>().Select(c => new RefItemDto((int)c, c.Label(), c.Slug())).ToList(),
            Enum.GetValues<FragranceFamily>().Select(f => new RefItemDto((int)f, f.Label(), f.Slug())).ToList(),
            notes.OrderBy(n => n.Name, turkish).ToList(),
            accords.OrderBy(a => a.Name, turkish).ToList(),
            Enum.GetValues<Season>().Select(s => new RefItemDto((int)s, s.Label(), s.Slug())).ToList(),
            Enum.GetValues<AgeGroup>().Select(a => new RefItemDto((int)a, a.Label(), a.Slug())).ToList(),
            Enum.GetNames<Gender>().ToList());
    }

    // ----------------------------------------------------------------- sorgu

    private IQueryable<Perfume> BuildListQuery(PerfumeListQuery q)
    {
        var query = uow.GetRepository<Perfume>().AsNoTracking().Where(p => p.IsPublished);

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

        if (Split(q.Accord) is { } accordSlugs)
            query = query.Where(p => p.Accords.Any(a => accordSlugs.Contains(a.Accord.Slug)));

        if (Split(q.Note) is { } noteSlugs)
            query = query.Where(p => p.Notes.Any(n => noteSlugs.Contains(n.Note.Slug)));

        // Mevsim filtresi "bu mevsime uygun" demek; her parfüm her mevsimden oy aldığı
        // için eşik koymadan filtre hiçbir şey elemez.
        if (ParseEnums(q.Season, Lookups.SeasonFromSlug) is { Length: > 0 } seasons)
            query = query.Where(p => p.Seasons.Any(s => seasons.Contains(s.Season) && s.Score >= 60));

        if (ParseEnums(q.AgeGroup, Lookups.AgeGroupFromSlug) is { Length: > 0 } ages)
            query = query.Where(p => p.AgeGroups.Any(a => ages.Contains(a.AgeGroup) && a.Votes > 0));

        if (q.MinYear is { } minYear)
            query = query.Where(p => p.ReleaseYear >= minYear);

        if (q.MaxYear is { } maxYear)
            query = query.Where(p => p.ReleaseYear <= maxYear);

        if (q.MinRating is { } minRating)
            query = query.Where(p => p.AvgRating >= minRating);

        if (q.MinVotes is { } minVotes)
            query = query.Where(p => p.RatingCount >= minVotes);

        return query;
    }

    /// <summary>EF projeksiyonundan gelen ham kart satırı; etiket/slug/yol bellekte hesaplanır.</summary>
    private sealed record PerfumeCardRow(
        string Name, string Slug, string BrandName, string BrandSlug, Gender Gender,
        Concentration? Concentration, FragranceFamily? Family, int? ReleaseYear,
        string? ImageUrl, decimal AvgRating, int RatingCount, List<string> Accords);

    private static PerfumeCardDto ToCard(PerfumeCardRow r) => new(
        r.Name, r.Slug, new BrandRefDto(r.BrandName, r.BrandSlug),
        r.Gender.ToString(), r.Concentration?.Label(), r.Family?.Label(), r.Family?.Slug(),
        r.ReleaseYear, r.ImageUrl, r.AvgRating, r.RatingCount, r.Accords,
        PerfumeUrl.Path(r.Gender, r.Concentration?.Slug(), r.BrandSlug, r.Slug));

    // --------------------------------------------------------------- eşleme

    private static PerfumeDetailDto MapDetail(Perfume perfume)
    {
        List<NoteDto> NotesOf(NoteLayer layer) => perfume.Notes
            .Where(n => n.Layer == layer)
            .OrderBy(n => n.SortOrder)
            .Select(n => new NoteDto(n.Note.Name, n.Note.Slug, n.Note.Category))
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

        var maxTimeVote = Math.Max(perfume.DayVotes, perfume.NightVotes);
        var ageTotal = perfume.AgeGroups.Sum(a => a.Votes);

        List<PerfumeAlternativeDto> Related(PerfumeRelationKind kind) => perfume.AlternativesAsSource
            .Where(a => a.Kind == kind)
            .OrderBy(a => a.SortOrder)
            .Select(a => new PerfumeAlternativeDto(
                a.TargetPerfume.Name,
                a.TargetPerfume.Slug,
                new BrandRefDto(a.TargetPerfume.Brand.Name, a.TargetPerfume.Brand.Slug),
                a.TargetPerfume.ImageUrl,
                a.SimilarityRate,
                a.Note,
                PerfumeUrl.Path(a.TargetPerfume.Gender, a.TargetPerfume.Concentration?.Slug(),
                    a.TargetPerfume.Brand.Slug, a.TargetPerfume.Slug)))
            .ToList();

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
            Bars(VoteScales.Rating,
                perfume.RatingLove, perfume.RatingLike, perfume.RatingOk, perfume.RatingDislike, perfume.RatingHate),
            perfume.UserAvgRating,
            perfume.UserRatingCount,
            perfume.Accords
                .OrderBy(a => a.Rank)
                .Select(a => new AccordDto(a.Accord.Name, a.Accord.Slug, a.Width))
                .ToList(),
            new NotePyramidDto(
                NotesOf(NoteLayer.Top), NotesOf(NoteLayer.Middle), NotesOf(NoteLayer.Base), NotesOf(NoteLayer.All)),
            Enum.GetValues<Season>()
                .Select(s =>
                {
                    var row = perfume.Seasons.FirstOrDefault(x => x.Season == s);
                    return new ScoredRefDto(s.Label(), s.Slug(), row?.Score ?? 0, row?.Votes ?? 0);
                })
                .ToList(),
            [
                new(VoteScales.TimeOfDay[0].Label, VoteScales.TimeOfDay[0].Slug,
                    Percent(perfume.DayVotes, maxTimeVote), perfume.DayVotes),
                new(VoteScales.TimeOfDay[1].Label, VoteScales.TimeOfDay[1].Slug,
                    Percent(perfume.NightVotes, maxTimeVote), perfume.NightVotes),
            ],
            Bars(VoteScales.Longevity,
                perfume.LongevityVeryWeak, perfume.LongevityWeak, perfume.LongevityModerate,
                perfume.LongevityLongLasting, perfume.LongevityEternal),
            Bars(VoteScales.Sillage,
                perfume.SillageIntimate, perfume.SillageModerate, perfume.SillageStrong, perfume.SillageEnormous),
            Bars(VoteScales.GenderVote,
                perfume.GenderVoteFemale, perfume.GenderVoteMoreFemale, perfume.GenderVoteUnisex,
                perfume.GenderVoteMoreMale, perfume.GenderVoteMale),
            Bars(VoteScales.Price,
                perfume.PriceWayOverpriced, perfume.PriceOverpriced, perfume.PriceFair,
                perfume.PriceGoodValue, perfume.PriceGreatValue),
            Enum.GetValues<AgeGroup>()
                .Select(a =>
                {
                    var votes = perfume.AgeGroups.FirstOrDefault(x => x.AgeGroup == a)?.Votes ?? 0;
                    return new ScoredRefDto(a.Label(), a.Slug(), Percent(votes, ageTotal), votes);
                })
                .ToList(),
            perfume.UsageCount,
            breadcrumb,
            perfume.Dupes
                .Where(d => d.IsActive)
                .Select(d => new PerfumeDupeDto(
                    d.Id, d.DupeBrand.Name, d.DupeBrand.Slug, d.DupeBrand.OfficialUrl,
                    d.ProductCode, d.Url, d.SimilarityRate))
                .ToList(),
            Related(PerfumeRelationKind.RemindsMeOf),
            Related(PerfumeRelationKind.PeopleAlsoLike),
            PerfumeUrl.Path(perfume.Gender, perfume.Concentration?.Slug(), perfume.Brand.Slug, perfume.Slug));
    }

    /// <summary>Oy sayılarını ölçek etiketleriyle eşleyip yüzdeye çevirir.</summary>
    private static List<VoteBarDto> Bars(VoteScales.Step[] scale, params int[] votes)
    {
        var total = votes.Sum();
        return scale
            .Select((step, i) => new VoteBarDto(step.Label, step.Slug, votes[i], Percent(votes[i], total)))
            .ToList();
    }

    private static short Percent(int part, int total) =>
        total <= 0 ? (short)0 : (short)Math.Round(part * 100.0 / total);

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
