using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Anthropic;
using Anthropic.Models.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Claude (Anthropic Messages API) üzerinden yorum özeti üretir.
/// Anahtar <c>Ai:ApiKey</c> ayarından ya da <c>ANTHROPIC_API_KEY</c> ortam
/// değişkeninden okunur; ikisi de yoksa servis kapalıdır.
/// </summary>
public class AnthropicSummaryClient : IAiSummaryClient
{
    private const string PerfumeSystemPrompt = """
        Sen bir Türk parfüm bilgi portalının editörüsün. Sana bir parfüm hakkında
        kullanıcıların yazdığı yorumlar verilecek. Bu yorumları tek bir tarafsız
        özete dönüştür.

        Kurallar:
        - Türkçe yaz, 2-4 cümle, en fazla 400 karakter.
        - Sadece verilen yorumlardaki bilgileri kullan; yeni özellik uydurma.
        - Kalıcılık, yayılım ve genel izlenim öne çıkıyorsa bunlara değin.
        - Görüşler çelişiyorsa ikisini de belirt ("kimi kullanıcılar ... derken").
        - Reklam dili, ünlem, madde işareti, markdown ve başlık kullanma; düz metin yaz.
        - "Kullanıcılar" diye üçüncü şahıs anlat; kendinden bahsetme.
        """;

    private const string ComparisonSystemPrompt = """
        Sen bir Türk parfüm bilgi portalının editörüsün. Sana iki parfümün
        karşılaştırması hakkında kullanıcıların yazdığı yorumlar verilecek.
        Bu yorumları tek bir tarafsız özete dönüştür.

        Kurallar:
        - Türkçe yaz, 2-4 cümle, en fazla 400 karakter.
        - Sadece verilen yorumlardaki bilgileri kullan; yeni özellik uydurma.
        - İki koku arasındaki farklara odaklan: hangisi hangi durumda öne çıkıyor,
          kalıcılık/yayılım/kullanım anı olarak nerede ayrışıyorlar.
        - Yorumlarda net bir tercih varsa bunu belirt, yoksa "kullanıcılar ikiye
          bölünmüş" gibi dengeli bir ifade kullan.
        - Tek bir parfümü övüp diğerini kötüleme; taraf tutma.
        - Reklam dili, ünlem, madde işareti, markdown ve başlık kullanma; düz metin yaz.
        """;

    private readonly AnthropicClient? _client;
    private readonly string _model;
    private readonly ILogger<AnthropicSummaryClient> _logger;

    public AnthropicSummaryClient(IConfiguration configuration, ILogger<AnthropicSummaryClient> logger)
    {
        _logger = logger;
        _model = configuration["Ai:Model"] ?? "claude-opus-5";

        var apiKey = configuration["Ai:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");

        if (!string.IsNullOrWhiteSpace(apiKey))
            _client = new AnthropicClient { ApiKey = apiKey };
    }

    public bool IsEnabled => _client is not null;

    public Task<string?> SummarizePerfumeAsync(
        string perfumeName, string brandName, IReadOnlyList<string> comments, CancellationToken ct = default)
    {
        var prompt = new StringBuilder()
            .AppendLine($"Parfüm: {brandName} {perfumeName}")
            .AppendLine()
            .AppendLine("Kullanıcı yorumları:")
            .AppendLine(Bullets(comments))
            .ToString();

        return CompleteAsync(PerfumeSystemPrompt, prompt, ct);
    }

    public Task<string?> SummarizeComparisonAsync(
        string perfume1, string perfume2, IReadOnlyList<string> comments, CancellationToken ct = default)
    {
        var prompt = new StringBuilder()
            .AppendLine($"Karşılaştırılan parfümler: {perfume1} ve {perfume2}")
            .AppendLine()
            .AppendLine("Kullanıcı yorumları:")
            .AppendLine(Bullets(comments))
            .ToString();

        return CompleteAsync(ComparisonSystemPrompt, prompt, ct);
    }

    private static string Bullets(IReadOnlyList<string> comments) =>
        string.Join('\n', comments.Select(c => $"- {c.Replace('\n', ' ').Trim()}"));

    private async Task<string?> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct)
    {
        if (_client is null)
            return null;

        try
        {
            var response = await _client.Messages.Create(new MessageCreateParams
            {
                Model = _model,
                MaxTokens = 512,
                System = systemPrompt,
                Messages = [new() { Role = Role.User, Content = userPrompt }],
            }, cancellationToken: ct);

            var text = new StringBuilder();
            foreach (var block in response.Content)
            {
                if (block.TryPickText(out var textBlock))
                    text.Append(textBlock.Text);
            }

            var result = text.ToString().Trim();
            return string.IsNullOrWhiteSpace(result) ? null : result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI özeti üretilemedi");
            return null;
        }
    }
}
