using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;

namespace PerfumeComparer.Controllers.Filters;

/// <summary>
/// Yalnızca Admin rolündeki kullanıcıların girebildiği uçlar için filtre.
/// Jeton yoksa/geçersizse 401, jeton geçerli ama rol Admin değilse 403 döner.
/// Rol jetondan değil veritabanından okunur; böylece rol değişikliği anında geçerli olur.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireAdminAttribute : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        var tokens = http.RequestServices.GetRequiredService<ITokenService>();
        var principal = tokens.Validate(http.Request.Headers.Authorization.ToString());
        if (principal is null)
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Bu işlem için giriş yapmalısınız." });
            return;
        }

        var db = http.RequestServices.GetRequiredService<AppDbContext>();
        var role = await db.Users.AsNoTracking()
            .Where(u => u.Id == principal.UserId)
            .Select(u => (UserRole?)u.Role)
            .FirstOrDefaultAsync(http.RequestAborted);

        if (role != UserRole.Admin)
        {
            context.Result = new ObjectResult(new { message = "Bu işlem için yönetici yetkisi gerekir." })
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
        }
    }
}
