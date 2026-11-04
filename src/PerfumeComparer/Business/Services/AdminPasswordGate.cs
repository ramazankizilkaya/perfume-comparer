using System;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Yönetim paneli şifresi (<c>Admin:Password</c>). Şifre karşılaştırması sabit sürelidir.
/// Bir IP 15 dakika içinde 10 kez yanlış şifre girerse o pencere bitene kadar engellenir;
/// doğru giriş sayacı sıfırlar. Böylece şifre deneme yanılmayla kırılamaz.
/// Şifre tanımlı değilse şifreyle giriş tamamen kapalıdır.
/// </summary>
public interface IAdminPasswordGate
{
    bool IsEnabled { get; }

    /// <summary>Bu IP yanlış deneme sınırını aştı mı?</summary>
    bool IsBlocked(string ip);

    /// <summary>Şifreyi doğrular; yanlışsa IP'nin hatalı deneme sayısını artırır, doğruysa sıfırlar.</summary>
    bool Verify(string ip, string? password);
}

public sealed class AdminPasswordGate(IConfiguration config) : IAdminPasswordGate
{
    public const int MaxFailures = 10;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    private sealed record Failures(int Count, DateTimeOffset WindowStart);

    private readonly ConcurrentDictionary<string, Failures> _failures = new();

    private string? Configured => config["Admin:Password"];

    public bool IsEnabled => !string.IsNullOrWhiteSpace(Configured);

    public bool IsBlocked(string ip) =>
        _failures.TryGetValue(ip, out var f)
        && DateTimeOffset.UtcNow - f.WindowStart < Window
        && f.Count >= MaxFailures;

    public bool Verify(string ip, string? password)
    {
        var configured = Configured;
        var ok = !string.IsNullOrWhiteSpace(configured)
                 && !string.IsNullOrEmpty(password)
                 // Özetleri karşılaştırmak uzunluk farkını da sabit süreli yapar.
                 && CryptographicOperations.FixedTimeEquals(
                     SHA256.HashData(Encoding.UTF8.GetBytes(password)),
                     SHA256.HashData(Encoding.UTF8.GetBytes(configured)));

        if (ok)
        {
            _failures.TryRemove(ip, out _);
            return true;
        }

        var now = DateTimeOffset.UtcNow;
        _failures.AddOrUpdate(ip,
            _ => new Failures(1, now),
            (_, f) => now - f.WindowStart >= Window ? new Failures(1, now) : f with { Count = f.Count + 1 });
        return false;
    }
}
