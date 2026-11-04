using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// İletişim formunun bot koruması dört katmandır:
/// 1. Tuzak alan (honeypot): görünmeyen "website" alanı doluysa mesaj sessizce atılır.
/// 2. İmzalı form jetonu: form açılınca sunucu, açılış anını Auth:Secret ile imzalar.
///    Jetonsuz, bozuk, çok eski (2 saat) ya da çok hızlı (Contact:MinFillSeconds, varsayılan 3 sn)
///    gönderim reddedilir. Kabul edilen jeton bir daha kullanılamaz.
/// 3. IP sınırı: aynı adresten bir saatte en çok Contact:MaxPerHourPerIp (varsayılan 5) mesaj.
/// 4. İçerik denetimi: geçerli e-posta, makul uzunluk, en çok 2 bağlantı, isimde bağlantı yok.
/// Aynı kişinin aynı mesajı 24 saat içinde ikinci kez kaydedilmez.
/// </summary>
public partial class ContactMessageService(AppDbContext db, IConfiguration config, IMemoryCache cache) : IContactMessageService
{
    private const string Purpose = "contact-form:v1:";
    private static readonly TimeSpan TokenMaxAge = TimeSpan.FromHours(2);
    private const int MaxLinks = 2;
    private const int MinMessageLength = 10;

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")]
    private static partial Regex EmailPattern();

    [GeneratedRegex(@"https?://|www\.", RegexOptions.IgnoreCase)]
    private static partial Regex LinkPattern();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    private int MinFillSeconds => Math.Max(0, config.GetValue("Contact:MinFillSeconds", 3));
    private int MaxPerHourPerIp => Math.Max(1, config.GetValue("Contact:MaxPerHourPerIp", 5));

    private byte[] Secret =>
        Encoding.UTF8.GetBytes(config["Auth:Secret"] ?? "dev-insecure-secret-please-change-in-production-0123456789");

    // ------------------------------------------------------------ form jetonu

    public string IssueFormToken()
    {
        var payload = $"{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.{Convert.ToHexString(RandomNumberGenerator.GetBytes(12))}";
        return $"{Base64Url(Encoding.UTF8.GetBytes(payload))}.{Base64Url(Sign(payload))}";
    }

    private byte[] Sign(string payload)
    {
        using var hmac = new HMACSHA256(Secret);
        return hmac.ComputeHash(Encoding.UTF8.GetBytes(Purpose + payload));
    }

    /// <summary>Jetonun imzası tutuyorsa açılış anını ve tek kullanımlık kimliğini döner.</summary>
    private (DateTimeOffset IssuedAt, string Nonce)? ReadToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 200) return null;
        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        try
        {
            var payload = Encoding.UTF8.GetString(FromBase64Url(parts[0]));
            if (!CryptographicOperations.FixedTimeEquals(Sign(payload), FromBase64Url(parts[1]))) return null;

            var fields = payload.Split('.');
            if (fields.Length != 2 || !long.TryParse(fields[0], out var seconds)) return null;
            return (DateTimeOffset.FromUnixTimeSeconds(seconds), fields[1]);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static string NonceKey(string nonce) => $"contact-form-nonce:{nonce}";

    // ------------------------------------------------------------ gönderim

    public async Task<ContactSubmitResult> SubmitAsync(ContactMessageRequest request, string? ipAddress, CancellationToken ct = default)
    {
        // Bot tuzağı: başarılı görünür ki bot başka yol denemesin.
        if (!string.IsNullOrWhiteSpace(request.Website))
            return new(ContactSubmitStatus.Ignored, "Mesajınız alındı.");

        var token = ReadToken(request.FormToken);
        if (token is null || cache.TryGetValue(NonceKey(token.Value.Nonce), out _))
            return Invalid("Form doğrulanamadı. Sayfayı yenileyip tekrar deneyin.");

        var age = DateTimeOffset.UtcNow - token.Value.IssuedAt;
        if (age > TokenMaxAge)
            return Invalid("Formun süresi doldu. Sayfayı yenileyip tekrar deneyin.");
        if (age < TimeSpan.FromSeconds(MinFillSeconds))
            return Invalid("Form çok hızlı gönderildi. Birkaç saniye bekleyip tekrar deneyin.");

        var name = Whitespace().Replace(request.Name ?? "", " ").Trim();
        var email = (request.Email ?? "").Trim();
        var message = (request.Message ?? "").Trim();

        if (name.Length < 2 || name.Length > ContactMessage.MaxNameLength)
            return Invalid($"Ad soyad 2 ile {ContactMessage.MaxNameLength} karakter arasında olmalıdır.");
        if (LinkPattern().IsMatch(name))
            return Invalid("Ad soyad alanına bağlantı yazılamaz.");
        if (email.Length > ContactMessage.MaxEmailLength || !EmailPattern().IsMatch(email))
            return Invalid("Geçerli bir e-posta adresi yazın.");
        if (message.Length < MinMessageLength || message.Length > ContactMessage.MaxMessageLength)
            return Invalid($"Mesaj {MinMessageLength} ile {ContactMessage.MaxMessageLength} karakter arasında olmalıdır.");
        if (LinkPattern().Matches(message).Count > MaxLinks)
            return Invalid($"Mesajda en çok {MaxLinks} bağlantı olabilir.");

        var now = DateTimeOffset.UtcNow;
        var ip = string.IsNullOrWhiteSpace(ipAddress) ? null : ipAddress[..Math.Min(ipAddress.Length, 45)];

        if (ip is not null)
        {
            var hourAgo = now.AddHours(-1);
            var recent = await db.ContactMessages.CountAsync(m => m.IpAddress == ip && m.CreatedAt > hourAgo, ct);
            if (recent >= MaxPerHourPerIp)
                return new(ContactSubmitStatus.TooMany, "Çok fazla mesaj gönderdiniz. Lütfen bir saat sonra tekrar deneyin.");
        }

        var dayAgo = now.AddDays(-1);
        var lowerEmail = email.ToLowerInvariant();
        var duplicate = await db.ContactMessages.AnyAsync(
            m => m.Email.ToLower() == lowerEmail && m.Message == message && m.CreatedAt > dayAgo, ct);

        if (!duplicate)
        {
            db.ContactMessages.Add(new ContactMessage
            {
                Name = name,
                Email = email,
                Message = message,
                IpAddress = ip,
                CreatedAt = now,
            });
            await db.SaveChangesAsync(ct);
        }

        // Kullanılan jeton süresi bitene kadar bir daha kabul edilmez.
        cache.Set(NonceKey(token.Value.Nonce), true, TokenMaxAge);
        return new(ContactSubmitStatus.Saved, "Mesajınız bize ulaştı. En kısa sürede e-posta ile dönüş yapacağız.");
    }

    private static ContactSubmitResult Invalid(string message) => new(ContactSubmitStatus.Invalid, message);

    // ------------------------------------------------------------ yönetim

    public async Task<ContactMessageListDto> ListAsync(bool unreadOnly, int take, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 500);
        var query = db.ContactMessages.AsNoTracking();
        if (unreadOnly)
            query = query.Where(m => !m.IsRead);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(take)
            .Select(m => new ContactMessageDto(m.Id, m.Name, m.Email, m.Message, m.IsRead, m.CreatedAt))
            .ToListAsync(ct);

        var unread = await db.ContactMessages.CountAsync(m => !m.IsRead, ct);
        var total = await db.ContactMessages.CountAsync(ct);
        return new ContactMessageListDto(items, unread, total);
    }

    public async Task<bool> SetReadAsync(int id, bool isRead, CancellationToken ct = default) =>
        await db.ContactMessages.Where(m => m.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, isRead), ct) > 0;

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default) =>
        await db.ContactMessages.Where(m => m.Id == id).ExecuteDeleteAsync(ct) > 0;

    // ------------------------------------------------------------ yardımcılar

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
