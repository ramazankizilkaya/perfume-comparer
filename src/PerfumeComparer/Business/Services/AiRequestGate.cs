using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Ücretli AI çağrısı yapmadan önce sorulan kapı. Giriş yapmış kullanıcı her zaman
/// geçer; anonim istekler IP başına 10 saniyede 5 üretimle sınırlıdır. Önbellekten
/// (DB) dönen sonuçlar kapıya uğramaz, bu yüzden kapı yalnızca yeni üretim gerektiğinde
/// çağrılmalıdır.
/// </summary>
public interface IAiRequestGate
{
    /// <summary>Bu istek için yeni bir AI üretimine izin var mı? (Hak kullanır.)</summary>
    bool TryEnter(HttpContext context);
}

public sealed class AiRequestGate(ITokenService tokens) : IAiRequestGate
{
    private readonly PartitionedRateLimiter<string> _limiter =
        PartitionedRateLimiter.Create<string, string>(ip => RateLimitPartition.GetFixedWindowLimiter(ip,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromSeconds(10),
                QueueLimit = 0,
            }));

    public bool TryEnter(HttpContext context)
    {
        if (tokens.Validate(context.Request.Headers.Authorization.ToString()) is not null)
            return true;

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        using var lease = _limiter.AttemptAcquire(ip);
        return lease.IsAcquired;
    }
}
