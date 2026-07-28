using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Data;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Controllers;

/// <summary>
/// Yönetim uçları: tohumlama artık otomatik değil, buradan tetiklenir.
/// Frontend karşılığı: /admin sayfası.
/// </summary>
[ApiController]
[Route("api/admin")]
public class AdminController(ISeedService seeder, AiSummaryJob aiJob, IAiSummaryClient ai) : ControllerBase
{
    /// <summary>Tohumlanabilir şemalar ve kayıt sayıları.</summary>
    [HttpGet("seed")]
    public async Task<IActionResult> GetSeedStatus(CancellationToken ct)
    {
        var items = await seeder.GetStatusAsync(ct);
        return Ok(new { items, aiEnabled = ai.IsEnabled });
    }

    /// <summary>Tek bir şemayı tohumlar.</summary>
    [HttpPost("seed/{key}")]
    public async Task<IActionResult> SeedStep(string key, CancellationToken ct)
    {
        var result = await seeder.SeedStepAsync(key, ct);
        return result.Ok ? Ok(result) : BadRequest(result);
    }

    /// <summary>Tüm şemaları bağımlılık sırasına göre tohumlar.</summary>
    [HttpPost("seed")]
    public async Task<IActionResult> SeedAll(CancellationToken ct)
    {
        var results = await seeder.SeedAllAsync(ct);
        return Ok(new { results });
    }

    /// <summary>Veritabanını siler ve boş şemayı yeniden kurar (veri basmaz).</summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset(CancellationToken ct)
    {
        await seeder.ResetAsync(ct);
        return Ok(new { message = "Veritabanı sıfırlandı. Şema boş, veri basılmadı." });
    }

    /// <summary>Arka plan işini beklemeden AI özetlerini şimdi üretir.</summary>
    [HttpPost("ai-summaries")]
    public async Task<IActionResult> RunAiSummaries(CancellationToken ct)
    {
        if (!ai.IsEnabled)
            return BadRequest(new { message = "AI kapalı: Ai:ApiKey veya ANTHROPIC_API_KEY tanımlayın." });

        await aiJob.RunOnceAsync(ct);
        return Ok(new { message = "AI özetleri güncellendi." });
    }
}
