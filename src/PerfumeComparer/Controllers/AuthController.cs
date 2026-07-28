using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Data.Persistence;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    ITokenService tokens,
    IConfiguration config,
    IWebHostEnvironment env) : ControllerBase
{
    public record UserDto(int Id, string Email, string? Name, string? Picture);
    public record AuthResponse(string Token, UserDto User);

    public record GoogleLoginRequest(string Credential);
    public record DevLoginRequest(string? Name, string? Email);

    /// <summary>Gerçek Google girişi: istemciden gelen ID token (JWT) doğrulanır.</summary>
    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleLoginRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Credential))
            return BadRequest(new { message = "credential zorunludur." });

        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings();
            var clientId = config["Google:ClientId"];
            if (!string.IsNullOrWhiteSpace(clientId))
                settings.Audience = new[] { clientId };

            payload = await GoogleJsonWebSignature.ValidateAsync(req.Credential, settings);
        }
        catch (Exception)
        {
            return Unauthorized(new { message = "Google kimliği doğrulanamadı." });
        }

        var user = await UpsertAsync(payload.Subject, payload.Email, payload.Name, payload.Picture, ct);
        return Ok(new AuthResponse(tokens.Issue(user), ToDto(user)));
    }

    /// <summary>
    /// Geliştirici girişi: gerçek Google olmadan, Google'dan dönecek claim'lerin
    /// aynısını (sub, email, name, picture) mock üretir. Sadece Development ortamında açık.
    /// </summary>
    [HttpPost("dev-login")]
    public async Task<IActionResult> DevLogin([FromBody] DevLoginRequest? req, CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var name = string.IsNullOrWhiteSpace(req?.Name) ? PickName() : req!.Name!.Trim();
        var email = string.IsNullOrWhiteSpace(req?.Email)
            ? $"{Slug(name)}.{Random.Shared.Next(100, 999)}@dev.local"
            : req!.Email!.Trim();
        var sub = "dev|" + email.ToLowerInvariant();

        var user = await UpsertAsync(sub, email, name, picture: null, ct);
        return Ok(new AuthResponse(tokens.Issue(user), ToDto(user)));
    }

    /// <summary>Geçerli oturum jetonuna karşılık gelen kullanıcıyı döner.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var principal = tokens.Validate(Request.Headers.Authorization.ToString());
        if (principal is null) return Unauthorized();

        var user = await db.Users.FindAsync([principal.UserId], ct);
        return user is null ? Unauthorized() : Ok(ToDto(user));
    }

    private async Task<AppUser> UpsertAsync(string sub, string? email, string? name, string? picture, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleSubjectId == sub, ct);
        if (user is null && !string.IsNullOrWhiteSpace(email))
            user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null)
        {
            user = new AppUser
            {
                Email = email ?? $"{sub}@unknown.local",
                DisplayName = name,
                GoogleSubjectId = sub,
                AvatarUrl = picture,
                Role = UserRole.User,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.Users.Add(user);
        }
        else
        {
            user.GoogleSubjectId ??= sub;
            if (!string.IsNullOrWhiteSpace(name)) user.DisplayName = name;
            if (!string.IsNullOrWhiteSpace(picture)) user.AvatarUrl = picture;
        }

        await db.SaveChangesAsync(ct);
        return user;
    }

    private static UserDto ToDto(AppUser u) => new(u.Id, u.Email, u.DisplayName, u.AvatarUrl);

    private static readonly string[] Names =
        ["Deniz Yılmaz", "Ece Kaya", "Kerem Demir", "Selin Aydın", "Mert Şahin", "Zeynep Çelik", "Arda Koç", "Naz Öztürk"];

    private static string PickName() => Names[Random.Shared.Next(Names.Length)];

    private static string Slug(string s) =>
        new string(s.ToLowerInvariant().Replace(' ', '.').Where(c => char.IsLetterOrDigit(c) || c == '.').ToArray());
}
