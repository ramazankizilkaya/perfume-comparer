using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Karşılaştırma sayfasındaki "hangisini tercih ediyorsunuz?" oyları. Oy vermek için
/// giriş ya da yorum gerekmez; seçmen bir anahtarla tanınır (girişli kullanıcıda
/// kullanıcı id'si, misafirde tarayıcı kimliği).
/// </summary>
public interface IComparisonVoteService
{
    /// <summary>Çiftin oy özeti. Parfümlerden biri yoksa (ya da ikisi aynıysa) <c>null</c> döner.</summary>
    Task<ComparisonVoteSummaryDto?> GetAsync(string slug1, string slug2, string? voterKey, CancellationToken ct = default);

    /// <summary>
    /// Seçmenin oyunu kaydeder ve güncel özeti döner. Seçmen çift başına tek oy kullanır:
    /// tekrar oy verirse oyu değişir. <paramref name="preferredSlug"/> boşsa oy geri alınır.
    /// Parfümlerden biri yoksa <c>null</c> döner; tercih çiftten biri değilse <see cref="System.ArgumentException"/> fırlatır.
    /// </summary>
    Task<ComparisonVoteSummaryDto?> CastAsync(string slug1, string slug2, string voterKey, string? preferredSlug, CancellationToken ct = default);
}
