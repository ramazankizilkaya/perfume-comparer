using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Google Gemini üzerinden JSON üreten ince istemci. Anahtar <c>Gemini:ApiKey</c>
/// ayarından ya da <c>GEMINI_API_KEY</c> ortam değişkeninden okunur; ikisi de
/// yoksa <see cref="Enabled"/> false döner ve çağıranlar kendi yedek mantığına düşer.
/// </summary>
public interface IGeminiClient
{
    /// <summary>Kullanılabilir bir anahtar var mı? False ise hiçbir çağrı yapılmaz.</summary>
    bool Enabled { get; }

    /// <summary>Metin isteminden JSON üretir ve <typeparamref name="T"/> tipine çözer.</summary>
    Task<T?> GenerateJsonAsync<T>(string prompt, CancellationToken ct = default) where T : class;

    /// <summary>Metin istemi + görsel ile JSON üretir (görsel doğrulama için).</summary>
    Task<T?> GenerateJsonAsync<T>(string prompt, byte[] image, string mimeType, CancellationToken ct = default) where T : class;
}
