using System.Net;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Business.Ai;

namespace AiRouterTests;

/// <summary>Sırayla verilen cevapları dönen sahte sağlayıcı. Her çağrıyı sayar.</summary>
internal sealed class FakeProvider(string name, bool paid = false, bool vision = false, int rpm = 0) : IAiProvider
{
    private readonly Queue<Func<CancellationToken, Task<string>>> _replies = new();
    private Func<CancellationToken, Task<string>> _default = _ => Task.FromResult("{\"value\":\"" + name + "\"}");

    public string Name => name;
    public bool IsPaid => paid;
    public bool SupportsVision => vision;
    public int RequestsPerMinute => rpm;
    public int Calls { get; private set; }

    public FakeProvider Returns(string text) { _replies.Enqueue(_ => Task.FromResult(text)); return this; }
    public FakeProvider Fails(AiFailureKind kind, TimeSpan? retryAfter = null)
    {
        _replies.Enqueue(_ => throw new AiProviderException(kind, $"{name} {kind}", retryAfter));
        return this;
    }
    public FakeProvider AlwaysFails(AiFailureKind kind)
    {
        _default = _ => throw new AiProviderException(kind, $"{name} {kind}");
        return this;
    }
    public FakeProvider Throws(Exception ex) { _replies.Enqueue(_ => throw ex); return this; }
    public FakeProvider Hangs() { _replies.Enqueue(async ct => { await Task.Delay(Timeout.Infinite, ct); return ""; }); return this; }

    public Task<string> CompleteAsync(AiRequest request, CancellationToken ct)
    {
        Calls++;
        return (_replies.Count > 0 ? _replies.Dequeue() : _default)(ct);
    }
}

internal sealed class FakeClock(DateTimeOffset start) : TimeProvider
{
    public DateTimeOffset Now { get; private set; } = start;
    public void Advance(TimeSpan by) => Now += by;
    public override DateTimeOffset GetUtcNow() => Now;
}

internal sealed class ListLogger<T> : ILogger<T>
{
    public List<(LogLevel Level, string Message)> Entries { get; } = [];
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
        Entries.Add((logLevel, formatter(state, exception)));
}

/// <summary>Tek bir sabit HTTP cevabı dönen handler; son isteğin gövdesini saklar.</summary>
internal sealed class StubHandler(HttpStatusCode status, string body, Action<HttpResponseMessage>? configure = null) : HttpMessageHandler
{
    public string? LastRequestBody { get; private set; }
    public HttpRequestMessage? LastRequest { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        LastRequest = request;
        LastRequestBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
        var res = new HttpResponseMessage(status) { Content = new StringContent(body) };
        configure?.Invoke(res);
        return res;
    }
}

/// <summary>Sahte sağlayıcıların döndüğü {"value": "..."} gövdesi.</summary>
internal sealed class Answer
{
    public string? Value { get; set; }
}
