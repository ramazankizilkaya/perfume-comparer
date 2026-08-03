using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// "Bu parfümü kullanıyorum" kaydı. Yaş grubu dağılımı kaynak veride olmadığı için
/// tamamen bu uçtan, site kullanıcılarının beyanıyla oluşur.
/// </summary>
public interface IUsageService
{
    /// <summary>
    /// Kullanımı kaydeder ve parfümün güncel yaş dağılımını döner.
    /// Parfüm yoksa <c>null</c> döner. Girişli kullanıcı ikinci kez bildirirse
    /// yeni kayıt açılmaz, mevcut kaydın yaş grubu güncellenir.
    /// </summary>
    Task<PerfumeUsageResultDto?> RecordAsync(string slug, string ageGroupSlug, int? userId, CancellationToken ct = default);
}
