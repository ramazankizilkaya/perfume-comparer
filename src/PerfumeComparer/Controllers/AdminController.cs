using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Ai;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Controllers.Filters;
using PerfumeComparer.Data;
using PerfumeComparer.Domain;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Controllers;

/// <summary>
/// Yönetim uçları: tohumlama artık otomatik değil, buradan tetiklenir.
/// Frontend karşılığı: /admin sayfası. Tüm uçlar Admin rolü ister
/// (jeton yoksa 401, rol Admin değilse 403).
/// </summary>
[ApiController]
[Route("api/admin")]
[RequireAdmin]
public class AdminController(
    ISeedService seeder,
    AiSummaryJob aiJob,
    IAiSummaryClient ai,
    IAiStatusSource aiStatus,
    IAdminDashboardService dashboard) : ControllerBase
{
    // ------------------------------------------------------------ panel

    /// <summary>Panel analitiği: ziyaretçi, yorum, danışman sayıları, günlük seri ve en çok ziyaret edilenler.</summary>
    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] int days = 30, CancellationToken ct = default) =>
        Ok(await dashboard.GetAnalyticsAsync(days, ct));

    /// <summary>Blog yazıları (gövde dahil). <c>status</c>: Pending, Published, Rejected, Draft; boşsa hepsi.</summary>
    [HttpGet("blogs")]
    public async Task<IActionResult> GetBlogs([FromQuery] string? status, CancellationToken ct)
    {
        BlogPostStatus? parsed = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<BlogPostStatus>(status, ignoreCase: true, out var s))
                return BadRequest(new { message = "Geçersiz durum." });
            parsed = s;
        }
        return Ok(await dashboard.GetBlogsAsync(parsed, ct));
    }

    /// <summary>Kullanıcı yorumları. <c>kind</c>: perfume | comparison; <c>status</c>: Approved | Rejected; boşsa hepsi.</summary>
    [HttpGet("comments")]
    public async Task<IActionResult> GetComments(
        [FromQuery] string kind = AdminDashboardService.PerfumeKind,
        [FromQuery] string? status = null,
        [FromQuery] int take = 100,
        CancellationToken ct = default)
    {
        if (!IsKnownKind(kind))
            return BadRequest(new { message = "kind perfume ya da comparison olmalı." });

        ModerationStatus? parsed = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ModerationStatus>(status, ignoreCase: true, out var s))
                return BadRequest(new { message = "Geçersiz durum." });
            parsed = s;
        }
        return Ok(await dashboard.GetCommentsAsync(kind, parsed, take, ct));
    }

    /// <summary>Yorumu sitede gizler (Rejected).</summary>
    [HttpPost("comments/{kind}/{id:int}/hide")]
    public Task<IActionResult> HideComment(string kind, int id, CancellationToken ct) =>
        SetCommentStatus(kind, id, ModerationStatus.Rejected, "Yorum gizlendi.", ct);

    /// <summary>Gizlenen yorumu yeniden yayına alır (Approved).</summary>
    [HttpPost("comments/{kind}/{id:int}/restore")]
    public Task<IActionResult> RestoreComment(string kind, int id, CancellationToken ct) =>
        SetCommentStatus(kind, id, ModerationStatus.Approved, "Yorum yeniden yayında.", ct);

    /// <summary>"Bana parfüm öner" kayıtları.</summary>
    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations([FromQuery] int take = 100, CancellationToken ct = default) =>
        Ok(await dashboard.GetRecommendationsAsync(take, ct));

    /// <summary>Kullanıcıların yüklediği parfüm fotoğrafları. <c>status</c>: pending | approved | all (veya boş).</summary>
    [HttpGet("photos")]
    public async Task<IActionResult> GetPhotos([FromQuery] string? status = null, [FromQuery] int take = 100, CancellationToken ct = default)
    {
        bool? isApproved = status?.Trim().ToLowerInvariant() switch
        {
            null or "" or "all" => null,
            "pending" => false,
            "approved" => true,
            _ => null,
        };

        if (!string.IsNullOrWhiteSpace(status) &&
            status.Trim().ToLowerInvariant() is not ("all" or "pending" or "approved"))
        {
            return BadRequest(new { message = "status pending, approved ya da all olmalı." });
        }

        return Ok(await dashboard.GetPhotosAsync(isApproved, take, ct));
    }

    /// <summary>Bekleyen kullanıcı fotoğrafını onaylar ve yayına alır.</summary>
    [HttpPost("photos/{id:int}/approve")]
    public async Task<IActionResult> ApprovePhoto(int id, CancellationToken ct) =>
        await dashboard.SetPhotoApprovedAsync(id, true, ct)
            ? Ok(new { message = "Fotoğraf onaylandı ve yayına alındı.", isApproved = true })
            : NotFound(new { message = "Fotoğraf bulunamadı." });

    /// <summary>Yayındaki kullanıcı fotoğrafını yayından kaldırır.</summary>
    [HttpPost("photos/{id:int}/unapprove")]
    public async Task<IActionResult> UnapprovePhoto(int id, CancellationToken ct) =>
        await dashboard.SetPhotoApprovedAsync(id, false, ct)
            ? Ok(new { message = "Fotoğraf yayından kaldırıldı.", isApproved = false })
            : NotFound(new { message = "Fotoğraf bulunamadı." });

    /// <summary>Kullanıcı fotoğrafını kalıcı olarak siler.</summary>
    [HttpDelete("photos/{id:int}")]
    public async Task<IActionResult> DeletePhoto(int id, CancellationToken ct) =>
        await dashboard.DeletePhotoAsync(id, ct)
            ? Ok(new { message = "Fotoğraf silindi." })
            : NotFound(new { message = "Fotoğraf bulunamadı." });

    private async Task<IActionResult> SetCommentStatus(string kind, int id, ModerationStatus status, string message, CancellationToken ct)
    {
        if (!IsKnownKind(kind))
            return BadRequest(new { message = "kind perfume ya da comparison olmalı." });

        return await dashboard.SetCommentStatusAsync(kind, id, status, ct)
            ? Ok(new { message, status = status.ToString() })
            : NotFound(new { message = "Yorum bulunamadı." });
    }

    private static bool IsKnownKind(string kind) =>
        kind is AdminDashboardService.PerfumeKind or AdminDashboardService.ComparisonKind;

    // ------------------------------------------------------------ bakım

    /// <summary>
    /// AI sağlayıcılarının anlık durumu: hangisi bekletiliyor, son hatası ne, kaç başarılı
    /// ve başarısız çağrı yaptı. Süresi dolan anahtar burada <c>lastFailureKind = "Auth"</c> olarak görünür.
    /// </summary>
    [HttpGet("ai-status")]
    public IActionResult GetAiStatus() => Ok(new { enabled = ai.IsEnabled, providers = aiStatus.GetStatus() });

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
            return BadRequest(new { message = "AI kapalı: Gemini, Groq, Mistral veya DeepSeek anahtarı tanımlayın." });

        await aiJob.RunOnceAsync(ct);
        return Ok(new { message = "AI özetleri güncellendi." });
    }
}
