using System.Net.Http;
using System.Threading;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace PerfumeComparer.Business.Ai;

public static class AiServiceCollectionExtensions
{
    /// <summary>Merkezi AI router'ını ve anahtarı tanımlı sağlayıcıları kaydeder.</summary>
    public static IServiceCollection AddAiRouter(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton(sp => new CentralAiRouter(
            CreateProviders(configuration),
            AiRouterOptions.From(configuration),
            sp.GetRequiredService<ILogger<CentralAiRouter>>()));
        services.AddSingleton<IAiClient>(sp => sp.GetRequiredService<CentralAiRouter>());
        services.AddSingleton<IAiStatusSource>(sp => sp.GetRequiredService<CentralAiRouter>());
        return services;
    }

    /// <summary>
    /// Sıra: ücretsizler (Gemini, Groq, Mistral), sonra ücretli DeepSeek. Anahtarı
    /// olmayan sağlayıcı listeye hiç girmez. Her bölümde isteğe bağlı <c>Model</c> ve
    /// <c>RequestsPerMinute</c> (ücretsiz kademenin dakikalık sınırı, 0 = sınırsız) vardır.
    /// </summary>
    public static IReadOnlyList<IAiProvider> CreateProviders(IConfiguration c)
    {
        // Süre sınırını router her deneme için ayrıca koyar.
        var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        var providers = new List<IAiProvider>();

        if (Key(c, "Gemini", "GEMINI_API_KEY") is { } gemini)
            providers.Add(new GeminiProvider(http, gemini,
                c["Gemini:Model"] ?? "gemini-3.5-flash-lite",
                c["Gemini:ThinkingLevel"] ?? "low",
                Rpm(c, "Gemini")));

        if (Key(c, "Groq", "GROQ_API_KEY") is { } groq)
            providers.Add(new OpenAiCompatibleProvider(http, "Groq", "https://api.groq.com/openai/v1/chat/completions",
                groq, c["Groq:Model"] ?? "openai/gpt-oss-120b", isPaid: false, Rpm(c, "Groq")));

        if (Key(c, "Mistral", "MISTRAL_API_KEY") is { } mistral)
            providers.Add(new OpenAiCompatibleProvider(http, "Mistral", "https://api.mistral.ai/v1/chat/completions",
                mistral, c["Mistral:Model"] ?? "mistral-small-latest", isPaid: false, Rpm(c, "Mistral")));

        if (Key(c, "DeepSeek", "DEEPSEEK_API_KEY") is { } deepSeek)
            providers.Add(new OpenAiCompatibleProvider(http, "DeepSeek", "https://api.deepseek.com/chat/completions",
                deepSeek, c["DeepSeek:Model"] ?? "deepseek-chat", isPaid: true, Rpm(c, "DeepSeek")));

        return providers;
    }

    private static string? Key(IConfiguration c, string section, string envVar)
    {
        var value = c[$"{section}:ApiKey"];
        if (string.IsNullOrWhiteSpace(value)) value = Environment.GetEnvironmentVariable(envVar);
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static int Rpm(IConfiguration c, string section) => c.GetValue<int?>($"{section}:RequestsPerMinute") ?? 0;
}
