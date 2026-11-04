using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Controllers.Filters;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Controllers;

/// <summary>
/// Yönetim panelinin "İletişim" sekmesi: iletişim formundan gelen mesajlar.
/// Admin rolü ister (jeton yoksa 401, rol Admin değilse 403).
/// </summary>
[ApiController]
[Route("api/admin/contact-messages")]
[RequireAdmin]
public class AdminContactController(IContactMessageService contact) : ControllerBase
{
    /// <summary><c>status</c>: unread (varsayılan) ya da all.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string status = "unread", [FromQuery] int take = 200, CancellationToken ct = default)
    {
        if (status is not ("unread" or "all"))
            return BadRequest(new { message = "status unread ya da all olmalı." });

        return Ok(await contact.ListAsync(status == "unread", take, ct));
    }

    [HttpPost("{id:int}/read")]
    public Task<IActionResult> MarkRead(int id, CancellationToken ct) => SetRead(id, true, "Mesaj okundu olarak işaretlendi.", ct);

    [HttpPost("{id:int}/unread")]
    public Task<IActionResult> MarkUnread(int id, CancellationToken ct) => SetRead(id, false, "Mesaj okunmadı olarak işaretlendi.", ct);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        await contact.DeleteAsync(id, ct)
            ? Ok(new { message = "Mesaj silindi." })
            : NotFound(new { message = "Mesaj bulunamadı." });

    private async Task<IActionResult> SetRead(int id, bool isRead, string message, CancellationToken ct) =>
        await contact.SetReadAsync(id, isRead, ct)
            ? Ok(new { message, isRead })
            : NotFound(new { message = "Mesaj bulunamadı." });
}
