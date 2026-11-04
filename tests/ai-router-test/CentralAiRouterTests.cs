using Microsoft.Extensions.Logging;
using PerfumeComparer.Business.Ai;
using Xunit;

namespace AiRouterTests;

public class CentralAiRouterTests
{
    private readonly FakeClock _clock = new(new DateTimeOffset(2026, 11, 2, 12, 0, 0, TimeSpan.Zero));
    private readonly ListLogger<CentralAiRouter> _logger = new();

    private CentralAiRouter Router(params IAiProvider[] providers) =>
        new(providers, new AiRouterOptions { AttemptTimeout = TimeSpan.FromMilliseconds(200) }, _logger, _clock);

    [Fact]
    public async Task Uses_first_free_provider_and_never_touches_paid_one()
    {
        var gemini = new FakeProvider("Gemini");
        var deepSeek = new FakeProvider("DeepSeek", paid: true);

        var result = await Router(deepSeek, gemini).GenerateJsonAsync<Answer>("p");

        Assert.Equal("Gemini", result?.Value);
        Assert.Equal(0, deepSeek.Calls);
    }

    [Fact]
    public async Task Paid_provider_answers_only_when_every_free_one_fails()
    {
        var gemini = new FakeProvider("Gemini").Fails(AiFailureKind.Quota);
        var groq = new FakeProvider("Groq").Fails(AiFailureKind.Transient);
        var deepSeek = new FakeProvider("DeepSeek", paid: true);

        var result = await Router(gemini, groq, deepSeek).GenerateJsonAsync<Answer>("p");

        Assert.Equal("DeepSeek", result?.Value);
        Assert.Equal(1, gemini.Calls);
        Assert.Equal(1, groq.Calls);
    }

    [Fact]
    public async Task Provider_out_of_quota_is_skipped_until_its_cooldown_ends()
    {
        var gemini = new FakeProvider("Gemini").Fails(AiFailureKind.Quota, retryAfter: TimeSpan.FromSeconds(30));
        var groq = new FakeProvider("Groq");
        var router = Router(gemini, groq);

        await router.GenerateJsonAsync<Answer>("p");
        var second = await router.GenerateJsonAsync<Answer>("p");

        Assert.Equal("Groq", second?.Value);
        Assert.Equal(1, gemini.Calls);

        _clock.Advance(TimeSpan.FromSeconds(31));
        var third = await router.GenerateJsonAsync<Answer>("p");

        Assert.Equal("Gemini", third?.Value);
        Assert.Equal(2, gemini.Calls);
    }

    [Fact]
    public async Task Expired_key_is_logged_as_error_and_shown_in_status()
    {
        var gemini = new FakeProvider("Gemini").Fails(AiFailureKind.Auth);
        var groq = new FakeProvider("Groq");
        var router = Router(gemini, groq);

        await router.GenerateJsonAsync<Answer>("p");

        Assert.Contains(_logger.Entries, e => e.Level == LogLevel.Error && e.Message.Contains("Gemini"));
        var status = router.GetStatus().Single(s => s.Name == "Gemini");
        Assert.Equal("cooldown", status.State);
        Assert.Equal("Auth", status.LastFailureKind);
        Assert.Equal(_clock.Now.AddMinutes(10), status.CooldownUntil);
    }

    [Fact]
    public async Task Invalid_json_moves_on_to_next_provider_without_cooldown()
    {
        var gemini = new FakeProvider("Gemini").Returns("Üzgünüm, yardımcı olamam.");
        var groq = new FakeProvider("Groq");
        var router = Router(gemini, groq);

        var result = await router.GenerateJsonAsync<Answer>("p");

        Assert.Equal("Groq", result?.Value);
        Assert.Equal("ok", router.GetStatus().Single(s => s.Name == "Gemini").State);
    }

    [Fact]
    public async Task Hanging_provider_times_out_and_next_one_answers()
    {
        var gemini = new FakeProvider("Gemini").Hangs();
        var groq = new FakeProvider("Groq");

        var result = await Router(gemini, groq).GenerateJsonAsync<Answer>("p");

        Assert.Equal("Groq", result?.Value);
    }

    [Fact]
    public async Task Unexpected_exception_never_escapes_to_caller()
    {
        var gemini = new FakeProvider("Gemini").Throws(new InvalidOperationException("boom"));
        var groq = new FakeProvider("Groq").Throws(new HttpRequestException("dns"));

        var result = await Router(gemini, groq).GenerateJsonAsync<Answer>("p");

        Assert.Null(result);
        Assert.Contains(_logger.Entries, e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task Caller_cancellation_is_propagated()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        var gemini = new FakeProvider("Gemini").Hangs();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => Router(gemini).GenerateJsonAsync<Answer>("p", cts.Token));
    }

    [Fact]
    public async Task When_every_provider_is_cooling_down_the_soonest_one_is_still_tried()
    {
        var gemini = new FakeProvider("Gemini").Fails(AiFailureKind.Auth);
        var groq = new FakeProvider("Groq").Fails(AiFailureKind.Quota, TimeSpan.FromSeconds(20));
        var router = Router(gemini, groq);

        Assert.Null(await router.GenerateJsonAsync<Answer>("p"));

        var result = await router.GenerateJsonAsync<Answer>("p");

        Assert.Equal("Groq", result?.Value);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task Requests_per_minute_limit_skips_provider_before_it_returns_429()
    {
        var gemini = new FakeProvider("Gemini", rpm: 2);
        var groq = new FakeProvider("Groq");
        var router = Router(gemini, groq);

        await router.GenerateJsonAsync<Answer>("p");
        await router.GenerateJsonAsync<Answer>("p");
        var third = await router.GenerateJsonAsync<Answer>("p");

        Assert.Equal("Groq", third?.Value);
        Assert.Equal(2, gemini.Calls);

        _clock.Advance(TimeSpan.FromMinutes(1));
        Assert.Equal("Gemini", (await router.GenerateJsonAsync<Answer>("p"))?.Value);
    }

    [Fact]
    public async Task Image_requests_go_only_to_vision_providers()
    {
        var groq = new FakeProvider("Groq");
        var gemini = new FakeProvider("Gemini", vision: true);

        var result = await Router(groq, gemini).GenerateJsonAsync<Answer>("p", [1, 2, 3], "image/png");

        Assert.Equal("Gemini", result?.Value);
        Assert.Equal(0, groq.Calls);
    }

    [Fact]
    public async Task Text_mode_returns_plain_text()
    {
        var gemini = new FakeProvider("Gemini").Returns("Düz bir paragraf.");

        Assert.Equal("Düz bir paragraf.", await Router(gemini).GenerateTextAsync("p"));
    }

    [Fact]
    public async Task Disabled_router_returns_null()
    {
        var router = Router();

        Assert.False(router.Enabled);
        Assert.Null(await router.GenerateTextAsync("p"));
    }

    [Theory]
    [InlineData("```json\n{\"value\":\"a\"}\n```")]
    [InlineData("İşte sonuç: {\"value\":\"a\"} umarım işe yarar")]
    [InlineData("{\"value\":\"a\"}")]
    public void Json_is_extracted_from_fences_and_surrounding_text(string text)
    {
        Assert.Equal("a", AiJson.TryDeserialize<Answer>(text)?.Value);
    }
}
