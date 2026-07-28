using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

/// <summary>Girişten sonra istemciye verilen basit HMAC imzalı oturum jetonu.</summary>
public interface ITokenService
{
    string Issue(AppUser user, TimeSpan? lifetime = null);

    /// <summary>Jetonu (veya "Bearer x" başlığını) doğrular; geçerliyse taşıdığı claim'leri döner.</summary>
    TokenPrincipal? Validate(string? token);
}

public record TokenPrincipal(int UserId, string Email, string? Name, string? Picture);
