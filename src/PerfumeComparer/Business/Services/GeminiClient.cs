using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PerfumeComparer.Business.Services;

/// <inheritdoc cref="IGeminiClient"/>
public class GeminiClient : IGeminiClient
{
    // Lite modelin ücretsiz kotası çok daha yüksek ve yanıtı ~1 saniye;
// sorguyu filtrelere çevirmek gibi basit bir iş için fazlasıyla yeterli.
    private const string DefaultModel = "gemini-3.5-flash-lite";

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _http;
    private readonly ILogger<GeminiClient> _logger;
    private readonly string? _apiKey;
    private readonly string _model;
    private readonly string _thinkingLevel;

    public GeminiClient(IConfiguration configuration, ILogger<GeminiClient> logger)
    {
        _logger = logger;
        _model = configuration["Gemini:Model"] ?? DefaultModel;

        // Düşünme seviyesi düşürülünce yanıt ~4 kat hızlanıyor; arama için gereken
        // basit JSON çıkarımında kalite farkı yok. Boş bırakılırsa alan gönderilmez.
        _thinkingLevel = configuration["Gemini:ThinkingLevel"] ?? "low";

        var key = configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
            key = Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        _apiKey = string.IsNullOrWhiteSpace(key) ? null : key.Trim();
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };

        if (_apiKey is null)
            _logger.LogWarning("Gemini anahtarı yok (Gemini:ApiKey veya GEMINI_API_KEY). Yapay zekâ özellikleri kapalı.");
    }

    public bool Enabled => _apiKey is not null;

    public Task<T?> GenerateJsonAsync<T>(string prompt, CancellationToken ct = default) where T : class =>
        SendAsync<T>(new object[] { new { text = prompt } }, ct);

    public Task<T?> GenerateJsonAsync<T>(string prompt, byte[] image, string mimeType, CancellationToken ct = default) where T : class =>
        SendAsync<T>(
            [
                new { text = prompt },
                new { inline_data = new { mime_type = mimeType, data = Convert.ToBase64String(image) } }
            ], ct);

    private async Task<T?> SendAsync<T>(object[] parts, CancellationToken ct) where T : class
    {
        if (_apiKey is null) return null;

        object generationConfig = string.IsNullOrWhiteSpace(_thinkingLevel)
            ? new { response_mime_type = "application/json" }
            : new
            {
                response_mime_type = "application/json",
                thinkingConfig = new { thinkingLevel = _thinkingLevel }
            };

        var payload = new { contents = new[] { new { parts } }, generationConfig };

        try
        {
            // Anahtar sorgu dizesinde değil başlıkta gider; böylece istek loglarına sızmaz.
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("x-goog-api-key", _apiKey);

            using var response = await _http.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini {Status} döndürdü: {Body}", (int)response.StatusCode, Truncate(body));
                return null;
            }

            var text = ExtractText(body);
            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogWarning("Gemini boş yanıt döndürdü.");
                return null;
            }

            return JsonSerializer.Deserialize<T>(text, JsonOpts);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini çağrısı başarısız oldu.");
            return null;
        }
    }

    /// <summary>Yanıttaki tüm metin parçalarını birleştirir; model düşünce parçaları araya girebiliyor.</summary>
    private static string ExtractText(string body)
    {
        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return "";

        if (!candidates[0].TryGetProperty("content", out var content)
            || !content.TryGetProperty("parts", out var parts))
            return "";

        var sb = new StringBuilder();
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var t) && t.GetString() is { Length: > 0 } s)
                sb.Append(s);
        }
        return sb.ToString().Trim();
    }

    private static string Truncate(string s) => s.Length <= 400 ? s : s[..400];
}
