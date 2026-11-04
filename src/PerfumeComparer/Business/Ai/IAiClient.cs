using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Ai;

/// <summary>
/// Uygulamadaki bütün yapay zekâ isteklerinin tek giriş noktası. Arkasında
/// <see cref="CentralAiRouter"/> durur: önce ücretsiz sağlayıcıları (Gemini, Groq,
/// Mistral) dener, hiçbiri yetişmezse ücretli DeepSeek'e düşer.
/// Sözleşme: iptal dışında hiçbir zaman exception fırlatmaz. Hiçbir sağlayıcı cevap
/// veremezse null döner ve çağıran kendi yerel yedeğine geçer.
/// </summary>
public interface IAiClient
{
    /// <summary>En az bir sağlayıcının anahtarı tanımlı mı? False ise hiçbir çağrı yapılmaz.</summary>
    bool Enabled { get; }

    /// <summary>Metin isteminden JSON üretir ve <typeparamref name="T"/> tipine çözer.
    /// Bozuk JSON dönen sağlayıcı atlanır, sıradaki denenir.</summary>
    Task<T?> GenerateJsonAsync<T>(string prompt, CancellationToken ct = default) where T : class;

    /// <summary>Metin istemi + görsel ile JSON üretir. Yalnızca görsel destekleyen sağlayıcılar denenir.</summary>
    Task<T?> GenerateJsonAsync<T>(string prompt, byte[] image, string mimeType, CancellationToken ct = default) where T : class;

    /// <summary>Metin isteminden düz metin üretir (karşılaştırma yazısı gibi).</summary>
    Task<string?> GenerateTextAsync(string prompt, CancellationToken ct = default);
}

/// <summary>Admin ekranı için sağlayıcıların anlık sağlık durumu.</summary>
public interface IAiStatusSource
{
    IReadOnlyList<AiProviderStatus> GetStatus();
}

/// <summary>Tek bir sağlayıcının durumu. <c>State</c>: "ok" ya da "cooldown" (bekletiliyor).</summary>
public sealed record AiProviderStatus(
    string Name,
    bool Paid,
    string State,
    DateTimeOffset? CooldownUntil,
    string? LastFailureKind,
    string? LastError,
    DateTimeOffset? LastErrorAt,
    DateTimeOffset? LastSuccessAt,
    long Successes,
    long Failures);
