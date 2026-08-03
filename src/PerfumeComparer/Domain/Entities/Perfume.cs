namespace PerfumeComparer.Domain.Entities;

public class Perfume
{
    public int Id { get; set; }
    public int BrandId { get; set; }
    public Brand Brand { get; set; } = null!;
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public Gender Gender { get; set; }
    public Concentration? Concentration { get; set; }

    /// <summary>En baskın ana akordan türetilir; filtre ve landing sayfaları bunu kullanır.</summary>
    public FragranceFamily? FragranceFamily { get; set; }

    public int? ReleaseYear { get; set; }
    public string? Description { get; set; }

    /// <summary>Yerel görsel yolu, örn: <c>/media/perfumes/chanel/bleu_de_chanel_9099.webp</c>.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Verinin çekildiği kaynak sayfa.</summary>
    public string? SourceUrl { get; set; }

    // --- Topluluk puanı (kaynak veriden gelir; sitede gösterilen ana puan) ---
    public decimal AvgRating { get; set; }
    public int RatingCount { get; set; }
    public int RatingLove { get; set; }
    public int RatingLike { get; set; }
    public int RatingOk { get; set; }
    public int RatingDislike { get; set; }
    public int RatingHate { get; set; }

    // --- Site kullanıcılarının kendi puanı (yorum formundan gelir) ---
    public decimal UserAvgRating { get; set; }
    public int UserRatingCount { get; set; }

    // --- Kalıcılık oylaması (oy sayıları) ---
    public int LongevityVeryWeak { get; set; }
    public int LongevityWeak { get; set; }
    public int LongevityModerate { get; set; }
    public int LongevityLongLasting { get; set; }
    public int LongevityEternal { get; set; }

    // --- Yayılım (sillage) oylaması ---
    public int SillageIntimate { get; set; }
    public int SillageModerate { get; set; }
    public int SillageStrong { get; set; }
    public int SillageEnormous { get; set; }

    // --- "Bu koku kime gider?" oylaması ---
    public int GenderVoteFemale { get; set; }
    public int GenderVoteMoreFemale { get; set; }
    public int GenderVoteUnisex { get; set; }
    public int GenderVoteMoreMale { get; set; }
    public int GenderVoteMale { get; set; }

    // --- Fiyat/değer oylaması ---
    public int PriceWayOverpriced { get; set; }
    public int PriceOverpriced { get; set; }
    public int PriceFair { get; set; }
    public int PriceGoodValue { get; set; }
    public int PriceGreatValue { get; set; }

    // --- Gündüz / gece oylaması ---
    public int DayVotes { get; set; }
    public int NightVotes { get; set; }

    /// <summary>"Bu parfümü kullanıyorum" diyen kişi sayısı.</summary>
    public int UsageCount { get; set; }

    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<PerfumeNote> Notes { get; set; } = [];
    public List<PerfumeAccord> Accords { get; set; } = [];
    public List<PerfumeSeason> Seasons { get; set; } = [];
    public List<PerfumeAgeGroup> AgeGroups { get; set; } = [];
    public List<PerfumeUsage> Usages { get; set; } = [];

    public List<PerfumeDupe> Dupes { get; set; } = [];
    public List<PerfumeAlternative> AlternativesAsSource { get; set; } = [];
    public List<PerfumeAlternative> AlternativesAsTarget { get; set; } = [];
}
