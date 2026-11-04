namespace PerfumeComparer.Domain.Entities;

/// <summary>
/// İletişim sayfasındaki (/tr/iletisim) formdan gelen mesaj. Giriş gerektirmez;
/// yönetim panelindeki "İletişim" sekmesinden okunur.
/// </summary>
public class ContactMessage
{
    public const int MaxNameLength = 100;
    public const int MaxEmailLength = 200;
    public const int MaxMessageLength = 4000;

    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Message { get; set; }

    /// <summary>Gönderenin IP adresi: aynı adresten gelen mesaj sayısını sınırlamak için tutulur.</summary>
    public string? IpAddress { get; set; }

    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
