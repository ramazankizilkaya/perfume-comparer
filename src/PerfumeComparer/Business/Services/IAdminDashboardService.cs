using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Domain;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Yönetim panelinin okuma ve moderasyon işleri: analitik, blog listesi, yorum gizleme,
/// danışman kayıtları. Blog onay/ret işlemleri <c>BlogController</c>'daki mevcut uçlardadır.
/// </summary>
public interface IAdminDashboardService
{
    /// <summary>Son <paramref name="days"/> günün analitiği (1-365 arasına sıkıştırılır).</summary>
    Task<AdminAnalyticsDto> GetAnalyticsAsync(int days, CancellationToken ct = default);

    /// <summary>Blog yazıları; <paramref name="status"/> boşsa hepsi (bekleyenler önce).</summary>
    Task<IReadOnlyList<AdminBlogDto>> GetBlogsAsync(BlogPostStatus? status, CancellationToken ct = default);

    /// <summary>Kullanıcı yorumları (AI özetleri hariç), en yeniden eskiye.</summary>
    Task<IReadOnlyList<AdminCommentDto>> GetCommentsAsync(string kind, ModerationStatus? status, int take, CancellationToken ct = default);

    /// <summary>Yorumu gizler ya da yeniden yayına alır. Yorum yoksa false.</summary>
    Task<bool> SetCommentStatusAsync(string kind, int id, ModerationStatus status, CancellationToken ct = default);

    /// <summary>"Bana parfüm öner" kayıtları, en yeniden eskiye.</summary>
    Task<IReadOnlyList<AdminRecommendationDto>> GetRecommendationsAsync(int take, CancellationToken ct = default);

    /// <summary>Kullanıcıların yüklediği parfüm fotoğrafları (bekleyenler veya yayındakiler).</summary>
    Task<AdminPhotoListDto> GetPhotosAsync(bool? isApproved, int take, CancellationToken ct = default);

    /// <summary>Kullanıcı fotoğrafını onaylar ya da yayından kaldırır.</summary>
    Task<bool> SetPhotoApprovedAsync(int id, bool isApproved, CancellationToken ct = default);

    /// <summary>Kullanıcı fotoğrafını veritabanından ve diskten siler.</summary>
    Task<bool> DeletePhotoAsync(int id, CancellationToken ct = default);
}
