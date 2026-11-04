using System.Net;
using System.Net.Http.Headers;
using PerfumeComparer.Business.Ai;
using Xunit;

namespace AiRouterTests;

public class ProviderTests
{
    private static GeminiProvider Gemini(StubHandler handler) => new(new HttpClient(handler), "key", "model", "low", 0);

    private static OpenAiCompatibleProvider DeepSeek(StubHandler handler) =>
        new(new HttpClient(handler), "DeepSeek", "https://api.deepseek.com/chat/completions", "key", "deepseek-chat", isPaid: true, 0);

    private static async Task<AiProviderException> FailureOf(IAiProvider provider, AiRequest? request = null) =>
        await Assert.ThrowsAsync<AiProviderException>(() => provider.CompleteAsync(request ?? new AiRequest("p", Json: true), default));

    [Fact]
    public async Task Gemini_expired_key_400_is_classified_as_auth()
    {
        var body = """{"error":{"code":400,"message":"API key expired. Please renew the API key.","status":"INVALID_ARGUMENT"}}""";

        var ex = await FailureOf(Gemini(new StubHandler(HttpStatusCode.BadRequest, body)));

        Assert.Equal(AiFailureKind.Auth, ex.Kind);
    }

    [Fact]
    public async Task Gemini_429_reads_retry_delay_from_body()
    {
        var body = """{"error":{"code":429,"details":[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"34s"}]}}""";

        var ex = await FailureOf(Gemini(new StubHandler(HttpStatusCode.TooManyRequests, body)));

        Assert.Equal(AiFailureKind.Quota, ex.Kind);
        Assert.Equal(TimeSpan.FromSeconds(34), ex.RetryAfter);
    }

    [Fact]
    public async Task Gemini_sends_image_and_json_mode_and_joins_text_parts()
    {
        var handler = new StubHandler(HttpStatusCode.OK,
            """{"candidates":[{"content":{"parts":[{"text":"{\"value\":"},{"text":"\"a\"}"}]}}]}""");

        var text = await Gemini(handler).CompleteAsync(new AiRequest("p", Json: true, new AiImage([1, 2], "image/png")), default);

        Assert.Equal("{\"value\":\"a\"}", text);
        Assert.Contains("inline_data", handler.LastRequestBody);
        Assert.Contains("application/json", handler.LastRequestBody);
        Assert.Equal("key", handler.LastRequest!.Headers.GetValues("x-goog-api-key").Single());
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, AiFailureKind.Auth)]
    [InlineData(HttpStatusCode.PaymentRequired, AiFailureKind.Auth)]
    [InlineData(HttpStatusCode.NotFound, AiFailureKind.Auth)]
    [InlineData(HttpStatusCode.ServiceUnavailable, AiFailureKind.Transient)]
    [InlineData(HttpStatusCode.UnprocessableEntity, AiFailureKind.BadRequest)]
    public async Task OpenAi_compatible_errors_are_classified(HttpStatusCode status, AiFailureKind expected)
    {
        var ex = await FailureOf(DeepSeek(new StubHandler(status, "{}")));

        Assert.Equal(expected, ex.Kind);
    }

    [Fact]
    public async Task OpenAi_compatible_429_reads_retry_after_header()
    {
        var handler = new StubHandler(HttpStatusCode.TooManyRequests, "{}",
            res => res.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromSeconds(12)));

        var ex = await FailureOf(DeepSeek(handler));

        Assert.Equal(AiFailureKind.Quota, ex.Kind);
        Assert.Equal(TimeSpan.FromSeconds(12), ex.RetryAfter);
    }

    [Fact]
    public async Task OpenAi_compatible_json_mode_is_sent_and_prompt_mentions_json()
    {
        var handler = new StubHandler(HttpStatusCode.OK, """{"choices":[{"message":{"content":" {\"value\":\"a\"} "}}]}""");

        var text = await DeepSeek(handler).CompleteAsync(new AiRequest("Filtreleri çıkar", Json: true), default);

        Assert.Equal("{\"value\":\"a\"}", text);
        Assert.Contains("json_object", handler.LastRequestBody);
        Assert.Contains("JSON", handler.LastRequestBody);
        Assert.Equal("Bearer", handler.LastRequest!.Headers.Authorization!.Scheme);
    }

    [Fact]
    public async Task OpenAi_compatible_text_mode_has_no_json_format()
    {
        var handler = new StubHandler(HttpStatusCode.OK, """{"choices":[{"message":{"content":"Paragraf"}}]}""");

        await DeepSeek(handler).CompleteAsync(new AiRequest("Yaz", Json: false), default);

        Assert.DoesNotContain("response_format", handler.LastRequestBody);
    }
}
