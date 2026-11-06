using System;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Kullanıcıların yüklediği veya blog yazılarına eklediği görselleri doğrular,
/// WebP biçimine dönüştürür ve <c>/media/user-photos/...</c> altına kaydeder.
/// </summary>
public interface IImageWebpService
{
    /// <summary>Dosyanın sihirli baytlarından (JPEG, PNG, WebP) MIME türünü bulur; tanımadığına null döner.</summary>
    string? DetectMimeType(ReadOnlySpan<byte> bytes);

    /// <summary>JPEG, PNG veya WebP baytlarını çözüp WebP biçimine dönüştürür; geçersiz görselde null döner.</summary>
    Task<byte[]?> ConvertToWebpAsync(byte[] inputBytes, CancellationToken ct = default);

    /// <summary>WebP baytlarını <c>UserPhotosRoot/{subFolder}/{guid}.webp</c> olarak kaydeder ve göreli URL'sini döner.</summary>
    Task<string> SaveWebpAsync(byte[] webpBytes, string subFolder, CancellationToken ct = default);

    /// <summary>
    /// Blog kapak veya içerik görselini doğrular; dış bağlantı veya data URL ise indirip WebP olarak
    /// yerel klasöre kaydeder. Geçersiz adreste null döner.
    /// </summary>
    Task<string?> NormalizeBlogImageAsync(string? rawUrl, CancellationToken ct = default);

    /// <summary>Markdown gövdesindeki <c>![alt](url)</c> görsellerini yerel WebP adreslerine dönüştürür.</summary>
    Task<string> NormalizeMarkdownImagesAsync(string markdownBody, CancellationToken ct = default);
}

