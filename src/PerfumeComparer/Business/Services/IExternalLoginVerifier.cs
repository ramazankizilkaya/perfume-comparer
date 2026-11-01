namespace PerfumeComparer.Business.Services;

/// <summary>
/// Dış sağlayıcının (Facebook) doğruladığı kullanıcı bilgisi. <see cref="Email"/> yalnızca
/// sağlayıcı verdiyse dolar; Facebook yalnızca onaylanmış e-postayı döner.
/// </summary>
public record ExternalIdentity(string Subject, string? Email, string? Name, string? Picture);

/// <summary>Facebook ile girişte istemcinin gönderdiği kullanıcı erişim jetonu Graph API ile doğrulanır.</summary>
public interface IFacebookLoginVerifier
{
    /// <summary>Jeton bizim uygulamaya aitse kimliği döner; aksi halde ya da Facebook ayarı yoksa null.</summary>
    Task<ExternalIdentity?> VerifyAsync(string accessToken, CancellationToken ct = default);
}
