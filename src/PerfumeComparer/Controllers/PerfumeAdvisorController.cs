using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Business.Services;

namespace PerfumeComparer.Controllers;

[ApiController]
[Route("api/perfume-advisor")]
public class PerfumeAdvisorController(
    IPerfumeAdvisorService advisor,
    ITokenService tokens) : ControllerBase
{
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Unauthorized(new { message = "Bu özellikten yararlanmak için giriş yapmalısınız." });

        var status = await advisor.GetStatusAsync(principal.UserId, ct);
        return Ok(status);
    }

    [HttpPost("recommend")]
    public async Task<IActionResult> Recommend([FromBody] PerfumeAdvisorRequest request, CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null)
            return Unauthorized(new { message = "Bu özellikten yararlanmak için giriş yapmalısınız." });

        if ((request.Gender is { Length: > 50 }) ||
            (request.LikedPerfumes is { Length: > 300 }) ||
            (request.DislikedNotes is { Length: > 300 }) ||
            (request.PreferredNotes is { Length: > 300 }) ||
            (request.Occasion is { Length: > 300 }) ||
            (request.Season is { Length: > 300 }) ||
            (request.FreeText is { Length: > 1000 }))
        {
            return BadRequest(new
            {
                success = false,
                message = "Girilen tercih metinleri çok uzun (not alanı en fazla 1000, diğer alanlar en fazla 300 karakter olabilir)."
            });
        }

        var result = await advisor.RecommendAsync(principal.UserId, request, ct);
        if (!result.Success && result.Perfume is null)
            return BadRequest(result);

        return Ok(result);
    }
}
