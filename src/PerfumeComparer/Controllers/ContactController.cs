using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Business.Services;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Controllers;

/// <summary>
/// İletişim formu (/tr/iletisim). Giriş gerekmez; bot koruması
/// <see cref="ContactMessageService"/> içindedir.
/// </summary>
[ApiController]
[Route("api/contact")]
public class ContactController(IContactMessageService contact) : ControllerBase
{
    /// <summary>Form açılınca alınan imzalı jeton; gönderimde <c>formToken</c> olarak geri yollanır.</summary>
    [HttpGet("form-token")]
    public IActionResult GetFormToken()
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new { token = contact.IssueFormToken() });
    }

    /// <summary>
    /// Mesajı kaydeder. Geçersiz alan 400, IP sınırı aşılınca 429 döner. IP sınırı kaydedilen
    /// mesajları sayar (Contact:MaxPerHourPerIp); reddedilen denemeler kayıt açmaz, onları genel sınır tutar.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] ContactMessageRequest request, CancellationToken ct)
    {
        var result = await contact.SubmitAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), ct);
        return result.Status switch
        {
            ContactSubmitStatus.Saved or ContactSubmitStatus.Ignored => Ok(new { message = result.Message }),
            ContactSubmitStatus.TooMany => StatusCode(StatusCodes.Status429TooManyRequests, new { message = result.Message }),
            _ => BadRequest(new { message = result.Message }),
        };
    }
}
