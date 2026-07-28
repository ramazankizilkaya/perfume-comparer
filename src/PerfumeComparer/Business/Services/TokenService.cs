using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Küçük, bağımsız bir oturum jetonu: base64url(payload) + "." + base64url(HMAC-SHA256(payload)).
/// Gerçek JWT altyapısı gerekmeden "kim giriş yaptı" bilgisini imzalı taşımak için yeterli.
/// Secret 'Auth:Secret' konfigürasyonundan gelir (dev'de güvensiz bir varsayılan kullanılır).
/// </summary>
public class TokenService(IConfiguration config) : ITokenService
{
    private byte[] Secret =>
        Encoding.UTF8.GetBytes(config["Auth:Secret"] ?? "dev-insecure-secret-please-change-in-production-0123456789");

    public string Issue(AppUser user, TimeSpan? lifetime = null)
    {
        var exp = DateTimeOffset.UtcNow.Add(lifetime ?? TimeSpan.FromDays(7)).ToUnixTimeSeconds();
        var payloadJson = JsonSerializer.SerializeToUtf8Bytes(new Payload(user.Id, user.Email, user.DisplayName, user.AvatarUrl, exp));
        var p = Base64Url(payloadJson);
        var sig = Base64Url(Sign(p));
        return $"{p}.{sig}";
    }

    public TokenPrincipal? Validate(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        token = token.Trim();
        if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            token = token["Bearer ".Length..].Trim();

        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        var expected = Base64Url(Sign(parts[0]));
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(parts[1])))
            return null;

        try
        {
            var payload = JsonSerializer.Deserialize<Payload>(Base64UrlDecode(parts[0]));
            if (payload is null) return null;
            if (DateTimeOffset.FromUnixTimeSeconds(payload.Exp) < DateTimeOffset.UtcNow) return null;
            return new TokenPrincipal(payload.Uid, payload.Email, payload.Name, payload.Picture);
        }
        catch
        {
            return null;
        }
    }

    private byte[] Sign(string data)
    {
        using var h = new HMACSHA256(Secret);
        return h.ComputeHash(Encoding.UTF8.GetBytes(data));
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        s = (s.Length % 4) switch { 2 => s + "==", 3 => s + "=", _ => s };
        return Convert.FromBase64String(s);
    }

    private record Payload(int Uid, string Email, string? Name, string? Picture, long Exp);
}
