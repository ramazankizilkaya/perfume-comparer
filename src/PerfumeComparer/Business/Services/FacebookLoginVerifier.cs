using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace PerfumeComparer.Business.Services;

/// <inheritdoc cref="IFacebookLoginVerifier"/>
public class FacebookLoginVerifier(IConfiguration config, ILogger<FacebookLoginVerifier> logger) : IFacebookLoginVerifier
{
    private const string Graph = "https://graph.facebook.com/v23.0";

    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };

    public async Task<ExternalIdentity?> VerifyAsync(string accessToken, CancellationToken ct = default)
    {
        var appId = config["Facebook:AppId"]?.Trim();
        var appSecret = config["Facebook:AppSecret"]?.Trim();
        if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(appSecret)) return null;

        try
        {
            // 1) Jeton bizim uygulamamıza mı verilmiş? Bu kontrol olmadan başka bir uygulamanın
            //    aynı kullanıcı için aldığı jeton burada geçerli sayılırdı.
            var debugUrl = $"{Graph}/debug_token?input_token={Uri.EscapeDataString(accessToken)}" +
                           $"&access_token={Uri.EscapeDataString($"{appId}|{appSecret}")}";
            using var debug = await GetJsonAsync(debugUrl, ct);
            if (debug is null || !debug.RootElement.TryGetProperty("data", out var data)) return null;

            var valid = data.TryGetProperty("is_valid", out var isValid) && isValid.ValueKind == JsonValueKind.True;
            var tokenApp = data.TryGetProperty("app_id", out var app) ? app.GetString() : null;
            var userId = data.TryGetProperty("user_id", out var uid) ? uid.GetString() : null;
            if (!valid || tokenApp != appId || string.IsNullOrWhiteSpace(userId)) return null;

            // 2) Profil. appsecret_proof, panelde "Require App Secret" açık olsa da çağrının geçmesini sağlar.
            var proof = Convert.ToHexString(
                HMACSHA256.HashData(Encoding.UTF8.GetBytes(appSecret), Encoding.UTF8.GetBytes(accessToken))).ToLowerInvariant();
            var meUrl = $"{Graph}/me?fields=id,name,email,picture.type(large)" +
                        $"&access_token={Uri.EscapeDataString(accessToken)}&appsecret_proof={proof}";
            using var me = await GetJsonAsync(meUrl, ct);
            if (me is null) return null;

            var root = me.RootElement;
            if (!root.TryGetProperty("id", out var id) || id.GetString() != userId) return null;

            // Facebook yalnızca onaylanmış e-postayı döner; kullanıcı izin vermediyse ya da hesabın
            // e-postası yoksa alan hiç gelmez.
            var email = root.TryGetProperty("email", out var e) ? e.GetString() : null;
            var name = root.TryGetProperty("name", out var n) ? n.GetString() : null;
            string? picture = null;
            if (root.TryGetProperty("picture", out var pic) && pic.TryGetProperty("data", out var pd)
                && !(pd.TryGetProperty("is_silhouette", out var sil) && sil.ValueKind == JsonValueKind.True))
                picture = pd.TryGetProperty("url", out var u) ? u.GetString() : null;

            return new ExternalIdentity(userId, email, name, picture);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Facebook jetonu doğrulanamadı.");
            return null;
        }
    }

    private static async Task<JsonDocument?> GetJsonAsync(string url, CancellationToken ct)
    {
        using var res = await Http.GetAsync(url, ct);
        if (!res.IsSuccessStatusCode) return null;
        return await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
    }
}
