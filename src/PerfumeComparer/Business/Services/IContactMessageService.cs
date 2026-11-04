using System.Threading;
using System.Threading.Tasks;
using PerfumeComparer.Business.Dtos;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// İletişim formu: botlara karşı korunan mesaj kaydı ve yönetim panelinde okuma.
/// </summary>
public interface IContactMessageService
{
    /// <summary>Formun açıldığı anı imzalı taşıyan jeton. Form gönderilirken geri yollanır.</summary>
    string IssueFormToken();

    /// <summary>Mesajı denetler ve kaydeder. <paramref name="ipAddress"/> gönderim sınırı için kullanılır.</summary>
    Task<ContactSubmitResult> SubmitAsync(ContactMessageRequest request, string? ipAddress, CancellationToken ct = default);

    /// <summary>Yönetim paneli listesi; <paramref name="unreadOnly"/> true ise yalnızca okunmamışlar.</summary>
    Task<ContactMessageListDto> ListAsync(bool unreadOnly, int take, CancellationToken ct = default);

    /// <summary>Mesajı okundu ya da okunmadı yapar. Mesaj yoksa false döner.</summary>
    Task<bool> SetReadAsync(int id, bool isRead, CancellationToken ct = default);

    /// <summary>Mesajı kalıcı olarak siler. Mesaj yoksa false döner.</summary>
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}
