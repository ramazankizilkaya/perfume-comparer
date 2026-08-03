using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record PerfumeDetailDto(
    string Name,
    string Slug,
    BrandRefDto Brand,
    string Gender,
    string? Concentration,
    string? ConcentrationSlug,
    string? FragranceFamily,
    string? FragranceFamilySlug,
    string? FragranceFamilyDescription,
    int? ReleaseYear,
    string? Description,
    string? ImageUrl,
    /// <summary>Topluluk puanı (5 üzerinden) ve oy sayısı.</summary>
    decimal AvgRating,
    int RatingCount,
    /// <summary>Puan dağılımı: bayıldım / beğendim / idare eder / sevmedim / nefret ettim.</summary>
    List<VoteBarDto> RatingBreakdown,
    /// <summary>Site kullanıcılarının kendi puanı (yorum formundan).</summary>
    decimal UserAvgRating,
    int UserRatingCount,
    List<AccordDto> Accords,
    NotePyramidDto Notes,
    List<ScoredRefDto> Seasons,
    /// <summary>Gündüz / gece uygunluğu.</summary>
    List<ScoredRefDto> TimeOfDay,
    List<VoteBarDto> Longevity,
    List<VoteBarDto> Sillage,
    List<VoteBarDto> GenderVotes,
    List<VoteBarDto> PriceVotes,
    /// <summary>"Bu parfümü kullanıyorum" diyenlerin yaş dağılımı.</summary>
    List<ScoredRefDto> AgeGroups,
    int UsageCount,
    List<BreadcrumbItemDto> Breadcrumb,
    List<PerfumeDupeDto> Dupes,
    /// <summary>"Bana bunu hatırlatıyor" ilişkisiyle bağlı parfümler.</summary>
    List<PerfumeAlternativeDto> Alternatives,
    /// <summary>"Bunu sevenler şunu da sever" ilişkisiyle bağlı parfümler.</summary>
    List<PerfumeAlternativeDto> AlsoLiked,
    /// <summary>SEO yolu, /parfum/ öneki olmadan.</summary>
    string Path);
