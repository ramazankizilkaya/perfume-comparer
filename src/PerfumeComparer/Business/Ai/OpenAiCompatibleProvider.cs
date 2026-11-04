using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Ai;

/// <summary>
/// OpenAI uyumlu /chat/completions ucu sunan sağlayıcılar: Groq, Mistral, DeepSeek.
/// Üçü de JSON modunu (<c>response_format: json_object</c>) destekler; bu mod istemde
/// "json" kelimesinin geçmesini şart koşar.
/// </summary>
public sealed class OpenAiCompatibleProvider(
    HttpClient http,
    string name,
    string endpoint,
    string apiKey,
    string model,
    bool isPaid,
    int requestsPerMinute) : IAiProvider
{
    public string Name => name;
    public bool IsPaid => isPaid;
    public bool SupportsVision => false;
    public int RequestsPerMinute => requestsPerMinute;

    public async Task<string> CompleteAsync(AiRequest request, CancellationToken ct)
    {
        if (request.Image is not null)
            throw new AiProviderException(AiFailureKind.BadRequest, $"{Name} görsel desteklemiyor.");

        var prompt = request.Json && !request.Prompt.Contains("json", StringComparison.OrdinalIgnoreCase)
            ? request.Prompt + "\n\nYanıtı JSON olarak döndür."
            : request.Prompt;

        var body = new Dictionary<string, object>
        {
            ["model"] = model,
            ["messages"] = new[] { new { role = "user", content = prompt } },
            // Yapısal çıkarımda düşük, serbest yazıda daha canlı sıcaklık.
            ["temperature"] = request.Json ? 0.3 : 0.7,
        };
        if (request.Json)
            body["response_format"] = new { type = "json_object" };

        using var req = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var res = await http.SendAsync(req, ct);
        var content = await res.Content.ReadAsStringAsync(ct);

        if (!res.IsSuccessStatusCode)
            throw AiErrorClassifier.Classify(Name, res.StatusCode, content, res.Headers);

        using var doc = JsonDocument.Parse(content);
        if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0
            && choices[0].TryGetProperty("message", out var msg)
            && msg.TryGetProperty("content", out var text)
            && text.ValueKind == JsonValueKind.String)
        {
            return text.GetString()!.Trim();
        }

        return "";
    }
}
