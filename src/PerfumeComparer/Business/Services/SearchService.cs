using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Metin araması ve doğal dil araması. İkisi de aynı puanlama mantığını izler:
/// önce aday parfümler indeks üzerinden toplanır, sonra her aday isim, marka,
/// nota, akor, açıklama ve popülerlik sinyalleriyle puanlanıp sıralanır.
/// </summary>
public class SearchService(
    IUnitOfWork uow,
    IAiSearchPlanner planner,
    ILogger<SearchService> logger) : ISearchService
{
    private const int MaxPageSize = 50;
    private const int CardAccordCount = 3;
    private const int AiResultLimit = 24;

    /// <summary>
    /// Bir sorgunun "isim araması" sayılması için gereken en düşük ad/marka puanı.
    /// Ölçüm: "bvlgari" 12.5, "bulgari man in black" 4.8, "jadore" 2.9 puan alırken
    /// "gece davetleri icin baharatli ud kokusu" gibi cümleler 0.0 alıyor.
    /// </summary>
    private const double NameMatchThreshold = 2.0;

    /// <summary>Muadil/klon araması yapıldığında öne çıkarılan uygun fiyatlı markalar.</summary>
    private static readonly string[] CloneBrandSlugs =
    [
        "lattafa-perfumes", "armaf", "afnan", "maison-alhambra", "paris-corner",
        "rasasi", "al-haramain-perfumes", "french-avenue", "fragrance-world",
        "ard-al-zaafaran", "swiss-arabian",
    ];

    // ------------------------------------------------------------ metin arama

    public async Task<PagedResult<PerfumeCardDto>> SearchAsync(string q, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var terms = SearchTextNormalizer.Normalize(q);
        if (terms.IsEmpty)
            return new PagedResult<PerfumeCardDto>([], page, pageSize, 0);

        var rows = await BuildTextRowsAsync(terms, ct);
        var totalCount = await rows.CountAsync(ct);
        var items = await rows
            .OrderByDescending(r => r.Score)
            .ThenByDescending(r => r.RatingCount)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var accords = await LoadAccordsAsync(items.Select(i => i.Slug).ToList(), ct);
        var cards = items.Select(r => ToCard(r, accords, isAi: false)).ToList();

        return new PagedResult<PerfumeCardDto>(cards, page, pageSize, totalCount);
    }

    public async Task<AutocompleteDto> AutocompleteAsync(string q, CancellationToken ct = default)
    {
        var terms = SearchTextNormalizer.Normalize(q);
        if (terms.Text.Length < ISearchService.MinQueryLength)
            return new AutocompleteDto([], [], [], [], []);

        var pattern = $"%{terms.Text}%";

        var rows = await BuildTextRowsAsync(terms, ct);
        var perfumes = (await rows
                .OrderByDescending(r => r.Score)
                .ThenByDescending(r => r.RatingCount)
                .Take(8)
                .ToListAsync(ct))
            .Select(r => new AutocompletePerfumeDto(
                r.Name, r.BrandName, r.Slug, r.ImageUrl, r.Gender,
                PerfumeUrl.Path(r.Gender, ConcSlug(r.Concentration), r.BrandSlug, r.Slug)))
            .ToList();

        var brands = await uow.GetRepository<Brand>().AsNoTracking()
            .Where(b => EF.Functions.ILike(EF.Functions.Unaccent(b.Name), EF.Functions.Unaccent(pattern))
                || EF.Functions.TrigramsSimilarity(EF.Functions.Unaccent(b.Name), EF.Functions.Unaccent(terms.Text)) > 0.25)
            .OrderByDescending(b => EF.Functions.TrigramsSimilarity(EF.Functions.Unaccent(b.Name), EF.Functions.Unaccent(terms.Text)))
            .Take(5)
            .Select(b => new AutocompleteItemDto(b.Name, b.Slug))
            .ToListAsync(ct);

        var notes = await uow.GetRepository<Note>().AsNoTracking()
            .Where(n => EF.Functions.ILike(EF.Functions.Unaccent(n.Name), EF.Functions.Unaccent(pattern))
                || EF.Functions.TrigramsSimilarity(EF.Functions.Unaccent(n.Name), EF.Functions.Unaccent(terms.Text)) > 0.25)
            .OrderByDescending(n => n.PerfumeCount)
            .Take(5)
            .Select(n => new AutocompleteItemDto(n.Name, n.Slug))
            .ToListAsync(ct);

        var accords = await uow.GetRepository<Accord>().AsNoTracking()
            .Where(a => EF.Functions.ILike(EF.Functions.Unaccent(a.Name), EF.Functions.Unaccent(pattern))
                || EF.Functions.TrigramsSimilarity(EF.Functions.Unaccent(a.Name), EF.Functions.Unaccent(terms.Text)) > 0.25)
            .OrderByDescending(a => a.PerfumeCount)
            .Take(5)
            .Select(a => new AutocompleteItemDto(a.Name, a.Slug))
            .ToListAsync(ct);

        var blogs = await uow.GetRepository<BlogPost>().AsNoTracking()
            .Where(b => b.Status == BlogPostStatus.Published && (
                EF.Functions.ILike(EF.Functions.Unaccent(b.Title), EF.Functions.Unaccent(pattern))
                || EF.Functions.TrigramsSimilarity(EF.Functions.Unaccent(b.Title), EF.Functions.Unaccent(terms.Text)) > 0.25))
            .OrderByDescending(b => b.PublishedAt)
            .Take(4)
            .Select(b => new AutocompleteItemDto(b.Title, b.Slug))
            .ToListAsync(ct);

        return new AutocompleteDto(perfumes, brands, notes, accords, blogs);
    }

    /// <summary>Sorgudaki kelimelerle eşleşen nota ve akorları bulup satır sorgusunu kurar.</summary>
    private async Task<IQueryable<PerfumeSearchRow>> BuildTextRowsAsync(SearchTerms terms, CancellationToken ct)
    {
        var probes = terms.Tokens.Length > 0 ? terms.Tokens : [terms.Text];
        var noteIds = await ResolveNoteIdsAsync(probes, ct);
        var accordIds = await ResolveAccordIdsAsync(probes, ct);
        return TextRows(terms, noteIds, accordIds);
    }

    private IQueryable<PerfumeSearchRow> TextRows(SearchTerms terms, int[] noteIds, int[] accordIds)
    {
        var q = terms.Text;
        var tokens = terms.Tokens.Length > 0 ? terms.Tokens : new[] { q };

        return uow.SqlQuery<PerfumeSearchRow>($"""
            WITH cand AS (
                      SELECT p.id FROM perfumes p
                       WHERE p.is_published AND f_unaccent(lower(p.name)) % {q}
                UNION SELECT p.id FROM perfumes p
                       WHERE p.is_published AND f_unaccent(lower(p.name)) LIKE '%' || {q} || '%'
                UNION SELECT p.id FROM perfumes p JOIN brands b ON b.id = p.brand_id
                       WHERE p.is_published AND (f_unaccent(lower(b.name)) % {q}
                                              OR f_unaccent(lower(b.name)) LIKE '%' || {q} || '%')
                UNION (SELECT pn.perfume_id FROM perfume_notes pn
                         JOIN perfumes p ON p.id = pn.perfume_id AND p.is_published
                        WHERE pn.note_id = ANY({noteIds}::int[])
                        ORDER BY p.rating_count DESC LIMIT 600)
                UNION (SELECT pa.perfume_id FROM perfume_accords pa
                         JOIN perfumes p ON p.id = pa.perfume_id AND p.is_published
                        WHERE pa.accord_id = ANY({accordIds}::int[])
                        ORDER BY p.rating_count DESC LIMIT 600)
                UNION (SELECT p.id FROM perfumes p
                        WHERE p.is_published AND length({q}) >= 4
                          AND f_unaccent(lower(coalesce(p.description, ''))) LIKE '%' || {q} || '%'
                        ORDER BY p.rating_count DESC LIMIT 400)
            )
            SELECT p.name, p.slug,
                   b.name AS brand_name, b.slug AS brand_slug,
                   p.gender, p.concentration AS concentration,
                   p.fragrance_family AS fragrance_family,
                   p.release_year, p.image_url, p.avg_rating, p.rating_count,
                   (
                     -- Ad eşleşmesi: tam ad > baştan eşleşme > içinde geçme
                     CASE WHEN f_unaccent(lower(p.name)) = {q} THEN 6.0
                          WHEN f_unaccent(lower(b.name || ' ' || p.name)) = {q} THEN 6.0
                          WHEN f_unaccent(lower(p.name)) LIKE {q} || '%' THEN 3.5
                          WHEN f_unaccent(lower(p.name)) LIKE '%' || {q} || '%' THEN 2.5
                          ELSE 0.0 END
                     -- Marka eşleşmesi
                   + CASE WHEN f_unaccent(lower(b.name)) = {q} THEN 2.5
                          WHEN f_unaccent(lower(b.name)) LIKE '%' || {q} || '%' THEN 1.5
                          ELSE 0.0 END
                     -- Yazım hatası toleransı (trigram benzerliği)
                   + 3.0 * similarity(f_unaccent(lower(p.name)), {q})
                   + 2.0 * similarity(f_unaccent(lower(b.name)), {q})
                   + 2.5 * word_similarity({q}, f_unaccent(lower(b.name || ' ' || p.name)))
                     -- Çok kelimeli sorgularda kaç kelime tutuyor
                   + 1.8 * (SELECT count(*) FROM unnest({tokens}::text[]) tok
                             WHERE f_unaccent(lower(b.name || ' ' || p.name)) LIKE '%' || tok || '%')::float8
                         / greatest(array_length({tokens}::text[], 1), 1)
                     -- Nota ve akor eşleşmesi
                   + CASE WHEN EXISTS (SELECT 1 FROM perfume_notes pn
                                        WHERE pn.perfume_id = p.id AND pn.note_id = ANY({noteIds}::int[]))
                          THEN 1.2 ELSE 0.0 END
                   + CASE WHEN EXISTS (SELECT 1 FROM perfume_accords pa
                                        WHERE pa.perfume_id = p.id AND pa.accord_id = ANY({accordIds}::int[])
                                          AND pa.rank < 5)
                          THEN 1.0 ELSE 0.0 END
                     -- Açıklama metni
                   + CASE WHEN length({q}) >= 4
                           AND f_unaccent(lower(coalesce(p.description, ''))) LIKE '%' || {q} || '%'
                          THEN 0.6 ELSE 0.0 END
                   + 0.9 * (SELECT count(*) FROM unnest({tokens}::text[]) tok
                             WHERE length(tok) >= 4
                               AND f_unaccent(lower(coalesce(p.description, ''))) LIKE '%' || tok || '%')::float8
                         / greatest(array_length({tokens}::text[], 1), 1)
                     -- Eşit puanları ayırmak için popülerlik
                   + 0.5 * least(p.rating_count::float8 / 3000.0, 1.0)
                   + 0.2 * (p.avg_rating::float8 / 5.0)
                   )::float8 AS score
            FROM cand
            JOIN perfumes p ON p.id = cand.id
            JOIN brands b ON b.id = p.brand_id
            """);
    }

    // ----------------------------------------------------- doğal dil (AI) arama

    public async Task<AiSearchResultDto> AiSearchAsync(string q, CancellationToken ct = default)
    {
        var raw = q?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(raw))
            return new AiSearchResultDto(raw, null, null, [], 0);

        var terms = SearchTextNormalizer.Normalize(raw);

        // Yapay zekâya yalnızca gerçekten doğal dil cümleleri gider. "dior sauvage"
        // gibi isim aramaları veritabanından zaten doğru cevaplanıyor; bunları da
        // modele göndermek hem yavaşlatır hem de günlük istek hakkını tüketir.
        if (!await IsNaturalLanguageAsync(terms, ct))
            return await TextFallbackAsync(raw, null, ct);

        var intent = await planner.PlanAsync(raw, ct);
        var aiAnswered = intent is not null;
        intent ??= planner.PlanLocally(terms);

        if (!intent.HasSignal)
            return await TextFallbackAsync(raw, intent.Summary, ct);

        var plan = await ResolveIntentAsync(intent, terms, ct);
        var rows = AiRows(terms, plan);

        var scored = await rows
            .Where(r => r.Score > 0)
            .OrderByDescending(r => r.Score)
            .ThenByDescending(r => r.RatingCount)
            .Take(AiResultLimit)
            .ToListAsync(ct);

        if (scored.Count == 0)
        {
            logger.LogInformation("Yapay zekâ niyeti sonuç vermedi, metin aramasına düşülüyor: {Query}", raw);
            return await TextFallbackAsync(raw, intent.Summary, ct);
        }

        var accords = await LoadAccordsAsync(scored.Select(r => r.Slug).ToList(), ct);
        var cards = scored.Select(r => ToCard(r, accords, isAi: aiAnswered)).ToList();

        var summary = string.IsNullOrWhiteSpace(intent.Summary)
            ? "Aramanıza en uygun parfüm profilleri eşleştirildi."
            : intent.Summary;

        return new AiSearchResultDto(raw, summary, intent.Summary, cards, cards.Count, aiAnswered);
    }

    /// <summary>Yapay zekâ sonuç veremediğinde klasik metin araması devreye girer; kartlar AI etiketi almaz.</summary>
    private async Task<AiSearchResultDto> TextFallbackAsync(string raw, string? summary, CancellationToken ct)
    {
        var paged = await SearchAsync(raw, 1, AiResultLimit, ct);
        return new AiSearchResultDto(
            raw,
            summary,
            summary,
            paged.Items.ToList(),
            paged.TotalCount,
            AiUsed: false);
    }

    /// <summary>Yapay zekânın döndürdüğü adları veritabanı kimliklerine çevirir.</summary>
    private record AiPlan(
        int[] AccordIds,
        int[] NoteIds,
        int[] AvoidAccordIds,
        int[] BrandIds,
        int[] CloneBrandIds,
        double CloneWeight,
        int[] AlternativeIds,
        string[] Genders,
        string[] Seasons,
        string[] Families,
        string[] Keywords,
        string DayNight,
        /// <summary>Kullanıcı cinsiyet belirttiyse tam eşleşen değer; kartlarda öne çıkarılır.</summary>
        string ExactGender,
        /// <summary>Popülerliğin puana katkısı. "Az bilinen" istendiğinde negatife döner.</summary>
        double PopularityWeight,
        /// <summary>Puan ortalamasının ağırlığı; niş aramada kaliteyi ayırt etmek için artar.</summary>
        double RatingWeight,
        /// <summary>Az bilinen kokular isteniyor mu?</summary>
        bool PreferNiche,
        /// <summary>Akor/nota/marka gibi keskin bir sinyal yoksa aday havuzu geniş tutulur.</summary>
        bool NeedsBroadPool,
        /// <summary>Açıklama metni taraması tüm tabloyu okur; yalnızca başka sinyal yokken açılır.</summary>
        bool ScanDescriptions);

    private async Task<AiPlan> ResolveIntentAsync(AiSearchIntent intent, SearchTerms terms, CancellationToken ct)
    {
        var accordIds = await ResolveAccordIdsAsync(Fold(intent.Accords), ct);
        var noteIds = await ResolveNoteIdsAsync(Fold(intent.Notes), ct);
        var avoidIds = await ResolveAccordIdsAsync(Fold(intent.AvoidAccords), ct);
        var brandIds = await ResolveBrandIdsAsync(Fold(intent.Brands), ct);

        var alternativeIds = await ResolveAlternativesAsync(intent, ct);

        // Muadil araması: katalogdaki uygun fiyatlı klon markaları öne çıkarılır.
        var cloneBrandIds = intent.IsCloneOrDupe
            ? await uow.GetRepository<Brand>().AsNoTracking()
                .Where(b => CloneBrandSlugs.Contains(b.Slug))
                .Select(b => b.Id)
                .ToArrayAsync(ct)
            : [];

        var genders = intent.Gender switch
        {
            "male" => new[] { nameof(Gender.Male), nameof(Gender.Unisex) },
            "female" => [nameof(Gender.Female), nameof(Gender.Unisex)],
            "unisex" => [nameof(Gender.Unisex)],
            _ => [],
        };

        var seasons = (intent.Seasons ?? [])
            .Where(s => Enum.TryParse<Season>(s, true, out _))
            .Select(s => Enum.Parse<Season>(s, true).ToString())
            .Distinct()
            .ToArray();

        var families = (intent.Families ?? [])
            .Where(f => Enum.TryParse<FragranceFamily>(f, true, out _))
            .Select(f => Enum.Parse<FragranceFamily>(f, true).ToString())
            .Distinct()
            .ToArray();

        // "az bilinen", "niş", "popüler" gibi kelimeler koku tarifi değil; açıklamada
        // aranırsa alakasız ürünleri getirir, o yüzden anahtar kelimelerden atılır.
        string[] metaWords = ["az", "bilinen", "bilinmeyen", "nis", "kesfedilmemis",
            "gizli", "siradisi", "populer", "unlu", "herkesin", "farkli", "nadir"];

        var keywords = Fold(intent.Keywords)
            .Where(k => k.Length >= 4)
            .Where(k => !k.Split(' ').Any(w => metaWords.Contains(w)))
            .Distinct(StringComparer.Ordinal)
            .Take(6)
            .ToArray();

        // Yapay zekâ hiç anahtar kelime vermediyse sorgunun kendi kelimeleri kullanılır.
        if (keywords.Length == 0)
            keywords = terms.Tokens.Where(t => t.Length >= 4).Take(6).ToArray();

        var hasStructuredSignal = accordIds.Length > 0 || noteIds.Length > 0
            || brandIds.Length > 0 || cloneBrandIds.Length > 0
            || alternativeIds.Length > 0 || families.Length > 0;

        var preferNiche = string.Equals(intent.Popularity, "niche", StringComparison.OrdinalIgnoreCase);

        return new AiPlan(
            accordIds, noteIds, avoidIds, brandIds, cloneBrandIds,
            intent.IsCloneOrDupe ? 2.5 : 0.0, alternativeIds,
            genders, seasons, families, keywords, intent.DayNight ?? "",
            NeedsBroadPool: !hasStructuredSignal,
            ExactGender: genders.Length > 0 ? genders[0] : "",
            PopularityWeight: preferNiche ? -1.6 : 0.8,
            RatingWeight: preferNiche ? 1.6 : 0.4,
            PreferNiche: preferNiche,
            ScanDescriptions: !hasStructuredSignal && !preferNiche && keywords.Length > 0);
    }

    /// <summary>"X benzeri" aramalarında X'in alternatiflerini ve aynı akorlu kokuları toplar.</summary>
    private async Task<int[]> ResolveAlternativesAsync(AiSearchIntent intent, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(intent.ReferencePerfume)) return [];

        var refTerms = SearchTextNormalizer.Normalize(intent.ReferencePerfume);
        if (refTerms.IsEmpty) return [];

        var refRow = await (await BuildTextRowsAsync(refTerms, ct))
            .OrderByDescending(r => r.Score)
            .ThenByDescending(r => r.RatingCount)
            .FirstOrDefaultAsync(ct);

        if (refRow is null) return [];

        var refPerfume = await uow.GetRepository<Perfume>().AsNoTracking()
            .Where(p => p.Slug == refRow.Slug)
            .Select(p => new { p.Id, p.FragranceFamily })
            .FirstOrDefaultAsync(ct);

        if (refPerfume is null) return [];

        var ids = await uow.GetRepository<PerfumeAlternative>().AsNoTracking()
            .Where(pa => pa.SourcePerfumeId == refPerfume.Id || pa.TargetPerfumeId == refPerfume.Id)
            .Select(pa => pa.SourcePerfumeId == refPerfume.Id ? pa.TargetPerfumeId : pa.SourcePerfumeId)
            .Distinct()
            .ToListAsync(ct);

        // Referansın kendisi listede olmasın.
        return ids.Where(id => id != refPerfume.Id).ToArray();
    }

    private IQueryable<PerfumeSearchRow> AiRows(SearchTerms terms, AiPlan plan)
    {
        // Akor ve nota sayısı arttıkça tek tek eşleşmelerin ağırlığı azalır;
        // böylece iki akorlu bir sorgu tek akorluyu ezmez.
        var accordWeight = 2.6 / Math.Max(1, plan.AccordIds.Length);
        var noteWeight = 1.8 / Math.Max(1, plan.NoteIds.Length);
        var tokens = terms.Tokens.Length > 0 ? terms.Tokens : new[] { terms.Text };

        return uow.SqlQuery<PerfumeSearchRow>($"""
            WITH cand AS (
                      (SELECT pa.perfume_id AS id FROM perfume_accords pa
                         JOIN perfumes p ON p.id = pa.perfume_id AND p.is_published
                        WHERE pa.accord_id = ANY({plan.AccordIds}::int[]) AND pa.rank < 6
                        ORDER BY p.rating_count DESC LIMIT 900)
                UNION (SELECT pn.perfume_id FROM perfume_notes pn
                         JOIN perfumes p ON p.id = pn.perfume_id AND p.is_published
                        WHERE pn.note_id = ANY({plan.NoteIds}::int[])
                        ORDER BY p.rating_count DESC LIMIT 900)
                UNION (SELECT p.id FROM perfumes p
                        WHERE p.is_published AND p.brand_id = ANY({plan.BrandIds}::int[])
                        ORDER BY p.rating_count DESC LIMIT 800)
                UNION (SELECT p.id FROM perfumes p
                        WHERE p.is_published AND p.brand_id = ANY({plan.CloneBrandIds}::int[])
                        ORDER BY p.rating_count DESC LIMIT 800)
                UNION  SELECT p.id FROM perfumes p
                        WHERE p.is_published AND p.id = ANY({plan.AlternativeIds}::int[])
                UNION (SELECT p.id FROM perfumes p
                        WHERE p.is_published AND p.fragrance_family = ANY({plan.Families}::text[])
                        ORDER BY p.rating_count DESC LIMIT 900)
                UNION (SELECT ps.perfume_id FROM perfume_seasons ps
                         JOIN perfumes p ON p.id = ps.perfume_id AND p.is_published
                        WHERE ps.season = ANY({plan.Seasons}::text[]) AND ps.score >= 45
                          AND (cardinality({plan.Genders}::text[]) = 0 OR p.gender = ANY({plan.Genders}::text[]))
                        ORDER BY p.rating_count DESC LIMIT 900)
                UNION (SELECT p.id FROM perfumes p
                        WHERE p.is_published AND {plan.NeedsBroadPool}
                          AND (cardinality({plan.Genders}::text[]) = 0 OR p.gender = ANY({plan.Genders}::text[]))
                        ORDER BY p.rating_count DESC LIMIT 900)
                UNION (SELECT p.id FROM perfumes p
                        WHERE p.is_published AND {plan.PreferNiche}
                          AND p.rating_count BETWEEN 25 AND 600
                          AND (cardinality({plan.Genders}::text[]) = 0 OR p.gender = ANY({plan.Genders}::text[]))
                        ORDER BY p.avg_rating DESC, p.rating_count DESC LIMIT 900)
                UNION (SELECT p.id FROM perfumes p
                        WHERE p.is_published AND {plan.ScanDescriptions} AND EXISTS (
                                SELECT 1 FROM unnest({plan.Keywords}::text[]) kw
                                 WHERE f_unaccent(lower(coalesce(p.description, ''))) LIKE '%' || kw || '%')
                        ORDER BY p.rating_count DESC LIMIT 600)
            )
            SELECT p.name, p.slug,
                   b.name AS brand_name, b.slug AS brand_slug,
                   p.gender, p.concentration AS concentration,
                   p.fragrance_family AS fragrance_family,
                   p.release_year, p.image_url, p.avg_rating, p.rating_count,
                   (
                     -- İstenen akorlardan kaçı var
                     {accordWeight} * (SELECT count(*) FROM perfume_accords pa
                                        WHERE pa.perfume_id = p.id
                                          AND pa.accord_id = ANY({plan.AccordIds}::int[])
                                          AND pa.rank < 6)::float8
                     -- İstenen notalardan kaçı var
                   + {noteWeight} * (SELECT count(*) FROM perfume_notes pn
                                      WHERE pn.perfume_id = p.id
                                        AND pn.note_id = ANY({plan.NoteIds}::int[]))::float8
                     -- "Şuna benzer" araması: doğrudan alternatif
                   + CASE WHEN p.id = ANY({plan.AlternativeIds}::int[]) THEN 3.0 ELSE 0.0 END
                     -- Sorguda geçen marka
                   + CASE WHEN p.brand_id = ANY({plan.BrandIds}::int[]) THEN 1.5 ELSE 0.0 END
                     -- Muadil araması: uygun fiyatlı klon markaları
                   + CASE WHEN p.brand_id = ANY({plan.CloneBrandIds}::int[]) THEN {plan.CloneWeight} ELSE 0.0 END
                     -- Mevsim uyumu
                   + CASE WHEN EXISTS (SELECT 1 FROM perfume_seasons ps
                                        WHERE ps.perfume_id = p.id
                                          AND ps.season = ANY({plan.Seasons}::text[])
                                          AND ps.score >= 45)
                          THEN 1.5 ELSE 0.0 END
                     -- Koku ailesi
                   + CASE WHEN p.fragrance_family = ANY({plan.Families}::text[]) THEN 1.2 ELSE 0.0 END
                     -- Gündüz / gece tercihi
                   + CASE WHEN {plan.DayNight} = 'night' AND p.night_votes > p.day_votes THEN 0.8
                          WHEN {plan.DayNight} = 'day' AND p.day_votes >= p.night_votes AND p.day_votes > 0 THEN 0.8
                          ELSE 0.0 END
                     -- Açıklamada geçen anahtar kelimeler
                   + 1.2 * (SELECT count(*) FROM unnest({plan.Keywords}::text[]) kw
                             WHERE f_unaccent(lower(coalesce(p.description, ''))) LIKE '%' || kw || '%')::float8
                         / greatest(array_length({plan.Keywords}::text[], 1), 1)
                     -- Sorgunun kendi kelimeleri isim/markada geçiyorsa
                   + 1.0 * (SELECT count(*) FROM unnest({tokens}::text[]) tok
                             WHERE f_unaccent(lower(b.name || ' ' || p.name)) LIKE '%' || tok || '%')::float8
                         / greatest(array_length({tokens}::text[], 1), 1)
                     -- İstenmeyen akor baskınsa ciddi ceza
                   - CASE WHEN EXISTS (SELECT 1 FROM perfume_accords pa
                                        WHERE pa.perfume_id = p.id
                                          AND pa.accord_id = ANY({plan.AvoidAccordIds}::int[])
                                          AND pa.rank < 3)
                          THEN 4.0 ELSE 0.0 END
                     -- Kullanıcı "erkek" dediyse unisex değil erkek kokular öne çıksın
                   + CASE WHEN {plan.ExactGender} <> '' AND p.gender = {plan.ExactGender}
                          THEN 2.0 ELSE 0.0 END
                     -- Popülerlik: normalde artı, "az bilinen" istenirse eksi
                   + {plan.PopularityWeight} * least(p.rating_count::float8 / 3000.0, 1.0)
                   + {plan.RatingWeight} * (p.avg_rating::float8 / 5.0)
                   )::float8 AS score
            FROM cand
            JOIN perfumes p ON p.id = cand.id
            JOIN brands b ON b.id = p.brand_id
            WHERE cardinality({plan.Genders}::text[]) = 0 OR p.gender = ANY({plan.Genders}::text[])
            """);
    }

    /// <summary>
    /// Sorgu bir isim/marka/nota araması mı, yoksa doğal dil cümlesi mi?
    /// Doğal dil cümleleri katalogdaki hiçbir ada benzemediği için ad puanları
    /// sıfır çıkar; ayrım bu farka dayanır ve tek bir ucuz SQL sorgusu maliyeti vardır.
    /// </summary>
    private async Task<bool> IsNaturalLanguageAsync(SearchTerms terms, CancellationToken ct)
    {
        if (terms.IsEmpty) return false;

        // Tek kelime her zaman anahtar kelime aramasıdır.
        var words = terms.Text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length <= 1) return false;

        // "bana ... öner", "... olmayan", "... için" gibi cümle işaretleri varsa
        // sorgu kesin doğal dildir; katalogda böyle bir ad yok.
        if (words.Any(SearchTextNormalizer.IsSentenceMarker)) return true;

        if (await NameMatchScoreAsync(terms.Text, ct) >= NameMatchThreshold) return false;

        // "tonka fasulyesi" gibi tek başına bir nota ya da akor adı da isim aramasıdır.
        if (await IsVocabularyTermAsync(terms.Text, ct)) return false;

        // "safranlı notalı parfümler": dolgu kelimeler atılınca geriye tek bir
        // nota/akor kalıyorsa bu aslında "safran" araması demektir.
        if (terms.Tokens.Length == 1
            && ((await ResolveNoteIdsAsync(terms.Tokens, ct)).Length > 0
                || (await ResolveAccordIdsAsync(terms.Tokens, ct)).Length > 0))
            return false;

        return true;
    }

    /// <summary>
    /// Sorgunun kendisi bir nota ya da akor adı mı? Burada bulanık eşleşme
    /// kullanılmaz: "bana tatlı bir koku öner" cümlesi "Tatlı Biber" notasına
    /// %33 benziyor ve bulanık bakılırsa yanlışlıkla isim araması sayılıyordu.
    /// </summary>
    private async Task<bool> IsVocabularyTermAsync(string q, CancellationToken ct)
    {
        var rows = await uow.SqlQuery<IdRow>($"""
            SELECT n.id FROM notes n
             WHERE f_unaccent(lower(n.name)) = {q}
                OR f_unaccent(lower(n.name)) LIKE {q} || ' %'
            UNION ALL
            SELECT a.id FROM accords a
             WHERE f_unaccent(lower(a.name)) = {q}
                OR f_unaccent(lower(a.name)) LIKE {q} || ' %'
            """).Take(1).ToListAsync(ct);

        return rows.Count > 0;
    }

    /// <summary>Sorgunun parfüm ve marka adlarına ne kadar benzediğinin en yüksek puanı.</summary>
    private async Task<double> NameMatchScoreAsync(string q, CancellationToken ct)
    {
        var rows = await uow.SqlQuery<ScoreRow>($"""
            WITH cand AS (
                      SELECT p.id FROM perfumes p
                       WHERE p.is_published AND f_unaccent(lower(p.name)) % {q}
                UNION SELECT p.id FROM perfumes p
                       WHERE p.is_published AND f_unaccent(lower(p.name)) LIKE '%' || {q} || '%'
                UNION SELECT p.id FROM perfumes p JOIN brands b ON b.id = p.brand_id
                       WHERE p.is_published AND (f_unaccent(lower(b.name)) % {q}
                                              OR f_unaccent(lower(b.name)) LIKE '%' || {q} || '%')
            )
            SELECT coalesce(max(
                CASE WHEN f_unaccent(lower(p.name)) = {q} THEN 6.0
                     WHEN f_unaccent(lower(b.name || ' ' || p.name)) = {q} THEN 6.0
                     WHEN f_unaccent(lower(p.name)) LIKE {q} || '%' THEN 3.5
                     WHEN f_unaccent(lower(p.name)) LIKE '%' || {q} || '%' THEN 2.5
                     ELSE 0.0 END
              + CASE WHEN f_unaccent(lower(b.name)) = {q} THEN 2.5
                     WHEN f_unaccent(lower(b.name)) LIKE '%' || {q} || '%' THEN 1.5
                     ELSE 0.0 END
              + 3.0 * similarity(f_unaccent(lower(p.name)), {q})
              + 2.0 * similarity(f_unaccent(lower(b.name)), {q})
              + 2.5 * word_similarity({q}, f_unaccent(lower(b.name || ' ' || p.name)))
            ), 0.0)::float8 AS score
            FROM cand
            JOIN perfumes p ON p.id = cand.id
            JOIN brands b ON b.id = p.brand_id
            """).ToListAsync(ct);

        return rows.Count > 0 ? rows[0].Score : 0.0;
    }

    // ------------------------------------------------------------- yardımcılar

    /// <summary>Sorgu kelimeleriyle bulanık eşleşen notaların kimliklerini bulur.</summary>
    private async Task<int[]> ResolveNoteIdsAsync(string[] probes, CancellationToken ct)
    {
        if (probes.Length == 0) return [];

        var ids = await uow.SqlQuery<IdRow>($"""
            SELECT DISTINCT n.id
            FROM notes n, unnest({probes}::text[]) AS probe
            WHERE length(probe) >= 3
              AND (f_unaccent(lower(n.name)) LIKE '%' || probe || '%'
                OR f_unaccent(lower(n.name)) % probe)
            """).Select(r => r.Id).Take(40).ToListAsync(ct);

        return [.. ids];
    }

    /// <summary>Sorgu kelimeleriyle bulanık eşleşen akorların kimliklerini bulur.</summary>
    private async Task<int[]> ResolveAccordIdsAsync(string[] probes, CancellationToken ct)
    {
        if (probes.Length == 0) return [];

        var ids = await uow.SqlQuery<IdRow>($"""
            SELECT DISTINCT a.id
            FROM accords a, unnest({probes}::text[]) AS probe
            WHERE length(probe) >= 3
              AND (f_unaccent(lower(a.name)) LIKE '%' || probe || '%'
                OR f_unaccent(lower(a.name)) % probe)
            """).Select(r => r.Id).Take(20).ToListAsync(ct);

        return [.. ids];
    }

    private async Task<int[]> ResolveBrandIdsAsync(string[] probes, CancellationToken ct)
    {
        if (probes.Length == 0) return [];

        var ids = await uow.SqlQuery<IdRow>($"""
            SELECT DISTINCT b.id
            FROM brands b, unnest({probes}::text[]) AS probe
            WHERE length(probe) >= 3
              AND (f_unaccent(lower(b.name)) LIKE '%' || probe || '%'
                OR f_unaccent(lower(b.name)) % probe)
            """).Select(r => r.Id).Take(20).ToListAsync(ct);

        return [.. ids];
    }

    private static string[] Fold(string[]? values) =>
        values is null ? [] : [.. values.Select(SearchTextNormalizer.Fold).Where(v => v.Length > 0)];

    /// <summary>Kart satırları için en baskın akorları tek sorguda toplar.</summary>
    private async Task<Dictionary<string, List<string>>> LoadAccordsAsync(List<string> slugs, CancellationToken ct)
    {
        if (slugs.Count == 0) return [];

        var rows = await uow.GetRepository<PerfumeAccord>().AsNoTracking()
            .Where(pa => slugs.Contains(pa.Perfume.Slug) && pa.Rank < CardAccordCount)
            .OrderBy(pa => pa.Rank)
            .Select(pa => new { pa.Perfume.Slug, pa.Accord.Name })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => r.Slug)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Name).ToList());
    }

    private static string? ConcSlug(string? enumName) =>
        Enum.TryParse<Concentration>(enumName, out var c) ? c.Slug() : null;

    private static PerfumeCardDto ToCard(PerfumeSearchRow r, Dictionary<string, List<string>> accords, bool isAi)
    {
        var conc = Enum.TryParse<Concentration>(r.Concentration, out var c) ? c : (Concentration?)null;
        var fam = Enum.TryParse<FragranceFamily>(r.FragranceFamily, out var f) ? f : (FragranceFamily?)null;
        return new(
            r.Name, r.Slug, new BrandRefDto(r.BrandName, r.BrandSlug),
            r.Gender, conc?.Label(), fam?.Label(), fam?.Slug(),
            r.ReleaseYear, r.ImageUrl, r.AvgRating, r.RatingCount,
            accords.GetValueOrDefault(r.Slug) ?? [],
            PerfumeUrl.Path(r.Gender, conc?.Slug(), r.BrandSlug, r.Slug),
            isAi);
    }

    private class IdRow
    {
        public int Id { get; set; }
    }

    private class ScoreRow
    {
        public double Score { get; set; }
    }
}
