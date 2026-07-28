using System.ComponentModel.DataAnnotations;

namespace PerfumeComparer.Business.Dtos;

/// <summary>
/// Filtre panelinin sorgu parametreleri. Çoklu değerler virgülle ayrılır:
/// /api/perfumes?gender=erkek&amp;brand=dior,chanel&amp;note=oud&amp;sort=rating
/// </summary>
public record PerfumeListQuery(
    /// <summary>Serbest metin araması (parfüm veya marka adında; büyük/küçük harf duyarsız).</summary>
    string? Q = null,
    /// <summary>Cinsiyet slug'ları (çoklu): erkek,kadin,unisex</summary>
    string? Gender = null,
    string? Brand = null,
    string? Concentration = null,
    /// <summary>Koku ailesi slug'ları: oryantal,odunsu</summary>
    string? Family = null,
    string? Note = null,
    string? Season = null,
    string? AgeGroup = null,

    [Range(1900, 2100, ErrorMessage = "Başlangıç yılı 1900 ile 2100 arasında olmalıdır.")]
    int? MinYear = null,

    [Range(1900, 2100, ErrorMessage = "Bitiş yılı 1900 ile 2100 arasında olmalıdır.")]
    int? MaxYear = null,

    [Range(0.0, 5.0, ErrorMessage = "Puan en az 0.0, en fazla 5.0 olabilir.")]
    decimal? MinRating = null,

    string? Sort = null,

    [Range(1, int.MaxValue, ErrorMessage = "Sayfa numarası 1 veya daha büyük olmalıdır.")]
    int Page = 1,

    [Range(1, 100, ErrorMessage = "Sayfa boyutu 1 ile 100 arasında olmalıdır.")]
    int PageSize = 24);
