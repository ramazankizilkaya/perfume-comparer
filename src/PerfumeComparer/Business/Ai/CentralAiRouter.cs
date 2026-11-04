using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PerfumeComparer.Business.Ai;

/// <summary>Router'ın süre ve bekletme ayarları (<c>Ai:*</c> bölümü).</summary>
public sealed record AiRouterOptions
{
    /// <summary>Tek bir sağlayıcıya verilen en uzun süre; dolunca sıradakine geçilir.</summary>
    public TimeSpan AttemptTimeout { get; init; } = TimeSpan.FromSeconds(15);

    /// <summary>Anahtar/yetki/bakiye/model hatasından sonra sağlayıcının atlandığı süre.</summary>
    public TimeSpan AuthCooldown { get; init; } = TimeSpan.FromMinutes(10);

    /// <summary>Kota hatası Retry-After bildirmezse kullanılan bekletme süresi.</summary>
    public TimeSpan QuotaCooldown { get; init; } = TimeSpan.FromSeconds(60);

    /// <summary>Zaman aşımı, ağ ya da 5xx hatasından sonraki bekletme süresi.</summary>
    public TimeSpan TransientCooldown { get; init; } = TimeSpan.FromSeconds(30);

    public static AiRouterOptions From(IConfiguration c) => new()
    {
        AttemptTimeout = TimeSpan.FromSeconds(c.GetValue<double?>("Ai:AttemptTimeoutSeconds") ?? 15),
        AuthCooldown = TimeSpan.FromMinutes(c.GetValue<double?>("Ai:AuthCooldownMinutes") ?? 10),
        QuotaCooldown = TimeSpan.FromSeconds(c.GetValue<double?>("Ai:QuotaCooldownSeconds") ?? 60),
        TransientCooldown = TimeSpan.FromSeconds(c.GetValue<double?>("Ai:TransientCooldownSeconds") ?? 30),
    };
}

/// <summary>
/// Merkezi AI yönlendirici. Sağlayıcıları önce ücretsizler (yapılandırma sırasıyla),
/// sonra ücretliler olacak şekilde dener. Hata veren sağlayıcı hata türüne göre bir süre
/// bekletilir; böylece kotası biten ya da anahtarı ölen sağlayıcı her istekte zaman
/// kaybettirmez. Anahtar hataları Error seviyesinde loglanır ve <see cref="GetStatus"/>
/// ile admin ekranında görülür.
/// </summary>
public sealed class CentralAiRouter : IAiClient, IAiStatusSource
{
    private readonly IReadOnlyList<ProviderState> _states;
    private readonly AiRouterOptions _options;
    private readonly ILogger<CentralAiRouter> _logger;
    private readonly TimeProvider _clock;

    public CentralAiRouter(
        IEnumerable<IAiProvider> providers,
        AiRouterOptions options,
        ILogger<CentralAiRouter> logger,
        TimeProvider? clock = null)
    {
        // OrderBy kararlıdır: aynı kademedeki sağlayıcılar yapılandırma sırasını korur.
        _states = providers.OrderBy(p => p.IsPaid).Select(p => new ProviderState(p)).ToList();
        _options = options;
        _logger = logger;
        _clock = clock ?? TimeProvider.System;

        if (_states.Count == 0)
        {
            _logger.LogWarning("Hiçbir AI anahtarı tanımlı değil. Yapay zekâ özellikleri kapalı.");
            return;
        }

        _logger.LogInformation("AI sağlayıcı sırası: {Order}",
            string.Join(" → ", _states.Select(s => s.Provider.IsPaid ? $"{s.Provider.Name} (ücretli)" : s.Provider.Name)));

        if (!_states.Any(s => s.Provider.IsPaid))
            _logger.LogWarning("Ücretli yedek sağlayıcı (DeepSeek) tanımlı değil; ücretsiz kotalar dolunca AI cevap veremez.");
    }

    public bool Enabled => _states.Count > 0;

    public Task<T?> GenerateJsonAsync<T>(string prompt, CancellationToken ct = default) where T : class =>
        DispatchAsync(new AiRequest(prompt, Json: true), AiJson.TryDeserialize<T>, ct);

    public Task<T?> GenerateJsonAsync<T>(string prompt, byte[] image, string mimeType, CancellationToken ct = default) where T : class =>
        DispatchAsync(new AiRequest(prompt, Json: true, new AiImage(image, mimeType)), AiJson.TryDeserialize<T>, ct);

    public Task<string?> GenerateTextAsync(string prompt, CancellationToken ct = default) =>
        DispatchAsync<string>(new AiRequest(prompt, Json: false), text => text, ct);

    public IReadOnlyList<AiProviderStatus> GetStatus() => _states.Select(s => s.Snapshot(Now)).ToList();

    private DateTimeOffset Now => _clock.GetUtcNow();

    private async Task<T?> DispatchAsync<T>(AiRequest request, Func<string, T?> parse, CancellationToken ct) where T : class
    {
        var candidates = _states.Where(s => request.Image is null || s.Provider.SupportsVision).ToList();
        if (candidates.Count == 0) return null;

        var attempted = false;
        foreach (var state in candidates)
        {
            if (!state.TryReserve(Now)) continue;

            attempted = true;
            var result = await TryProviderAsync(state, request, parse, ct);
            if (result is not null) return result;
        }

        // Hepsi bekletiliyorsa istek cevapsız kalmasın: en erken açılacak olanı yine de dene.
        if (!attempted)
        {
            var soonest = candidates.MinBy(s => s.CooldownUntil ?? DateTimeOffset.MinValue)!;
            soonest.ForceReserve(Now);
            var result = await TryProviderAsync(soonest, request, parse, ct);
            if (result is not null) return result;
        }

        _logger.LogError("Hiçbir AI sağlayıcısı cevap veremedi; çağıran yerel yedeğine geçiyor.");
        return null;
    }

    private async Task<T?> TryProviderAsync<T>(ProviderState state, AiRequest request, Func<string, T?> parse, CancellationToken ct)
        where T : class
    {
        var provider = state.Provider;
        using var attempt = CancellationTokenSource.CreateLinkedTokenSource(ct);
        attempt.CancelAfter(_options.AttemptTimeout);

        try
        {
            var text = await provider.CompleteAsync(request, attempt.Token);
            if (string.IsNullOrWhiteSpace(text))
                throw new AiProviderException(AiFailureKind.BadRequest, $"{provider.Name} boş yanıt döndürdü.");

            var parsed = parse(text)
                ?? throw new AiProviderException(AiFailureKind.BadRequest,
                    $"{provider.Name} geçersiz JSON döndürdü: {AiErrorClassifier.Truncate(text)}");

            if (state.RecordSuccess(Now))
                _logger.LogInformation("AI sağlayıcısı {Provider} yeniden cevap veriyor.", provider.Name);
            if (provider.IsPaid)
                _logger.LogInformation("Ücretsiz sağlayıcılar yetişmedi; istek ücretli {Provider} ile karşılandı.", provider.Name);

            return parsed;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            Fail(state, new AiProviderException(AiFailureKind.Transient,
                $"{provider.Name} {_options.AttemptTimeout.TotalSeconds:0} sn içinde cevap vermedi."));
        }
        catch (AiProviderException ex)
        {
            Fail(state, ex);
        }
        catch (Exception ex)
        {
            // Ağ hatası geçicidir; sağlayıcının çözülemeyen gövdesi bu isteğe özgüdür.
            var kind = ex is HttpRequestException ? AiFailureKind.Transient : AiFailureKind.BadRequest;
            Fail(state, new AiProviderException(kind, $"{provider.Name}: {ex.Message}"));
        }

        return null;
    }

    private void Fail(ProviderState state, AiProviderException ex)
    {
        TimeSpan? cooldown = ex.Kind switch
        {
            AiFailureKind.Auth => _options.AuthCooldown,
            AiFailureKind.Quota => Clamp(ex.RetryAfter ?? _options.QuotaCooldown),
            AiFailureKind.Transient => _options.TransientCooldown,
            _ => null,
        };

        state.RecordFailure(ex.Kind, ex.Message, cooldown, Now);
        var name = state.Provider.Name;

        switch (ex.Kind)
        {
            case AiFailureKind.Auth:
                _logger.LogError(
                    "AI sağlayıcısı {Provider} anahtar/yetki/bakiye/model hatası verdi; {Minutes:0} dk atlanacak. Ayarı kontrol edin: {Error}",
                    name, cooldown!.Value.TotalMinutes, ex.Message);
                break;
            case AiFailureKind.Quota:
                _logger.LogWarning("AI sağlayıcısı {Provider} kotası doldu; {Seconds:0} sn atlanacak. {Error}",
                    name, cooldown!.Value.TotalSeconds, ex.Message);
                break;
            case AiFailureKind.Transient:
                _logger.LogWarning("AI sağlayıcısı {Provider} geçici hata verdi; {Seconds:0} sn atlanacak. {Error}",
                    name, cooldown!.Value.TotalSeconds, ex.Message);
                break;
            default:
                _logger.LogWarning("AI sağlayıcısı {Provider} bu isteği karşılayamadı, sıradaki deneniyor. {Error}",
                    name, ex.Message);
                break;
        }
    }

    private static TimeSpan Clamp(TimeSpan t) =>
        t < TimeSpan.FromSeconds(5) ? TimeSpan.FromSeconds(5)
        : t > TimeSpan.FromHours(1) ? TimeSpan.FromHours(1)
        : t;

    /// <summary>Bir sağlayıcının bekletme, dakikalık sayaç ve istatistik durumu. Kilitle korunur.</summary>
    private sealed class ProviderState(IAiProvider provider)
    {
        private readonly object _lock = new();
        private readonly Queue<DateTimeOffset> _lastMinute = new();
        private AiFailureKind? _lastFailureKind;
        private string? _lastError;
        private DateTimeOffset? _lastErrorAt;
        private DateTimeOffset? _lastSuccessAt;
        private long _successes;
        private long _failures;

        public IAiProvider Provider => provider;
        public DateTimeOffset? CooldownUntil { get; private set; }

        /// <summary>Bekletilmiyorsa ve dakikalık sınır dolmadıysa bir deneme hakkı ayırır.</summary>
        public bool TryReserve(DateTimeOffset now)
        {
            lock (_lock)
            {
                if (CooldownUntil > now) return false;

                if (provider.RequestsPerMinute > 0)
                {
                    while (_lastMinute.Count > 0 && _lastMinute.Peek() <= now.AddMinutes(-1))
                        _lastMinute.Dequeue();
                    if (_lastMinute.Count >= provider.RequestsPerMinute) return false;
                }

                _lastMinute.Enqueue(now);
                return true;
            }
        }

        public void ForceReserve(DateTimeOffset now)
        {
            lock (_lock) _lastMinute.Enqueue(now);
        }

        /// <summary>Başarıyı kaydeder. Sağlayıcı daha önce hata vermişse true döner (yeniden açıldı).</summary>
        public bool RecordSuccess(DateTimeOffset now)
        {
            lock (_lock)
            {
                var recovered = _lastErrorAt is not null && (_lastSuccessAt is null || _lastErrorAt > _lastSuccessAt)
                                && _lastFailureKind is not AiFailureKind.BadRequest;
                _successes++;
                _lastSuccessAt = now;
                CooldownUntil = null;
                return recovered;
            }
        }

        public void RecordFailure(AiFailureKind kind, string message, TimeSpan? cooldown, DateTimeOffset now)
        {
            lock (_lock)
            {
                _failures++;
                _lastFailureKind = kind;
                _lastError = message;
                _lastErrorAt = now;
                if (cooldown is { } c) CooldownUntil = now + c;
            }
        }

        public AiProviderStatus Snapshot(DateTimeOffset now)
        {
            lock (_lock)
            {
                var coolingDown = CooldownUntil > now;
                return new AiProviderStatus(
                    provider.Name,
                    provider.IsPaid,
                    coolingDown ? "cooldown" : "ok",
                    coolingDown ? CooldownUntil : null,
                    _lastFailureKind?.ToString(),
                    _lastError,
                    _lastErrorAt,
                    _lastSuccessAt,
                    _successes,
                    _failures);
            }
        }
    }
}

/// <summary>Model çıktısından JSON gövdesini ayıklar: kod çiti ya da çevre metin olsa da çalışır.</summary>
public static class AiJson
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = true };

    public static T? TryDeserialize<T>(string text) where T : class
    {
        var json = Extract(text);
        if (json is null) return null;

        try
        {
            return JsonSerializer.Deserialize<T>(json, Options);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static string? Extract(string text)
    {
        var start = text.IndexOfAny(['{', '[']);
        if (start < 0) return null;

        var end = text.LastIndexOf(text[start] == '{' ? '}' : ']');
        return end > start ? text[start..(end + 1)] : null;
    }
}
