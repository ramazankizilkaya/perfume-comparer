using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Ai;

/// <summary>Bir sağlayıcı çağrısının neden başarısız olduğu. Router bekletme süresini buna göre seçer.</summary>
public enum AiFailureKind
{
    /// <summary>Anahtar geçersiz/süresi dolmuş, yetki ya da bakiye yok, model kaldırılmış. İnsan müdahalesi gerekir.</summary>
    Auth,
    /// <summary>Ücretsiz kota ya da hız sınırı doldu (429).</summary>
    Quota,
    /// <summary>Zaman aşımı, ağ hatası ya da sağlayıcının 5xx hatası.</summary>
    Transient,
    /// <summary>Bu isteğe özgü sorun (400, boş ya da bozuk yanıt). Sağlayıcı bekletilmez.</summary>
    BadRequest,
}

public sealed class AiProviderException(AiFailureKind kind, string message, TimeSpan? retryAfter = null)
    : Exception(message)
{
    public AiFailureKind Kind { get; } = kind;
    public TimeSpan? RetryAfter { get; } = retryAfter;
}

public sealed record AiImage(byte[] Data, string MimeType);

public sealed record AiRequest(string Prompt, bool Json, AiImage? Image = null);

/// <summary>Tek bir yapay zekâ sağlayıcısı. Hata durumunda <see cref="AiProviderException"/> fırlatır.</summary>
public interface IAiProvider
{
    string Name { get; }

    /// <summary>Ücretli sağlayıcılar yalnızca ücretsizlerin hepsi yetişmediğinde denenir.</summary>
    bool IsPaid { get; }

    bool SupportsVision { get; }

    /// <summary>Dakikadaki en fazla istek (0 = sınırsız). Dolunca sağlayıcı 429 beklemeden atlanır.</summary>
    int RequestsPerMinute { get; }

    Task<string> CompleteAsync(AiRequest request, CancellationToken ct);
}

/// <summary>HTTP hata yanıtlarını <see cref="AiFailureKind"/> türüne çevirir.</summary>
public static partial class AiErrorClassifier
{
    public static AiProviderException Classify(string provider, HttpStatusCode status, string body, HttpResponseHeaders? headers)
    {
        var code = (int)status;
        var message = $"{provider} HTTP {code}: {Truncate(body)}";

        // Gemini süresi dolan ya da geçersiz anahtarda 401 değil 400 döndürür.
        // 404: model kaldırılmış ya da adı yanlış; her istekte tekrarlanır, ayar düzeltilmeli.
        if (code is 401 or 402 or 403 or 404 || (code == 400 && LooksLikeKeyError(body)))
            return new AiProviderException(AiFailureKind.Auth, message);

        if (code == 429)
            return new AiProviderException(AiFailureKind.Quota, message, ReadRetryAfter(body, headers));

        if (code is 408 or >= 500)
            return new AiProviderException(AiFailureKind.Transient, message);

        return new AiProviderException(AiFailureKind.BadRequest, message);
    }

    private static bool LooksLikeKeyError(string body) =>
        body.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase)
        || body.Contains("API key expired", StringComparison.OrdinalIgnoreCase)
        || body.Contains("API key not valid", StringComparison.OrdinalIgnoreCase);

    /// <summary>Önce Retry-After başlığına, yoksa Gemini'nin gövdedeki "retryDelay" alanına bakar.</summary>
    private static TimeSpan? ReadRetryAfter(string body, HttpResponseHeaders? headers)
    {
        var header = headers?.RetryAfter;
        if (header?.Delta is { } delta) return delta;
        if (header?.Date is { } date) return date - DateTimeOffset.UtcNow;

        var match = RetryDelayRegex().Match(body);
        if (match.Success && double.TryParse(match.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds))
            return TimeSpan.FromSeconds(seconds);

        return null;
    }

    public static string Truncate(string s) => s.Length <= 300 ? s : s[..300];

    [GeneratedRegex("\"retryDelay\"\\s*:\\s*\"(\\d+(?:\\.\\d+)?)s\"")]
    private static partial Regex RetryDelayRegex();
}
