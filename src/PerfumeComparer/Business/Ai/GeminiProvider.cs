using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Ai;

/// <summary>Google Gemini (ücretsiz kademe). Görsel destekleyen tek sağlayıcı.</summary>
public sealed class GeminiProvider(HttpClient http, string apiKey, string model, string thinkingLevel, int requestsPerMinute)
    : IAiProvider
{
    public string Name => "Gemini";
    public bool IsPaid => false;
    public bool SupportsVision => true;
    public int RequestsPerMinute => requestsPerMinute;

    public async Task<string> CompleteAsync(AiRequest request, CancellationToken ct)
    {
        var parts = new List<object> { new { text = request.Prompt } };
        if (request.Image is { } image)
            parts.Add(new { inline_data = new { mime_type = image.MimeType, data = Convert.ToBase64String(image.Data) } });

        var generationConfig = new Dictionary<string, object>();
        if (request.Json) generationConfig["response_mime_type"] = "application/json";

        // Düşünme seviyesi düşürülünce yanıt ~4 kat hızlanıyor; boş bırakılırsa alan gönderilmez.
        if (!string.IsNullOrWhiteSpace(thinkingLevel))
            generationConfig["thinkingConfig"] = new { thinkingLevel };

        var payload = new { contents = new[] { new { parts } }, generationConfig };

        // Anahtar sorgu dizesinde değil başlıkta gider; böylece istek loglarına sızmaz.
        using var req = new HttpRequestMessage(HttpMethod.Post,
            $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        req.Headers.Add("x-goog-api-key", apiKey);

        using var res = await http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);

        if (!res.IsSuccessStatusCode)
            throw AiErrorClassifier.Classify(Name, res.StatusCode, body, res.Headers);

        return ExtractText(body);
    }

    /// <summary>Yanıttaki tüm metin parçalarını birleştirir; model düşünce parçaları araya girebiliyor.</summary>
    private static string ExtractText(string body)
    {
        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return "";

        if (!candidates[0].TryGetProperty("content", out var content) || !content.TryGetProperty("parts", out var parts))
            return "";

        var sb = new StringBuilder();
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var t) && t.GetString() is { Length: > 0 } s)
                sb.Append(s);
        }
        return sb.ToString().Trim();
    }
}
