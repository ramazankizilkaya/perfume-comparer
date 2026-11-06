using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace PerfumeComparer.Business.Services;

public partial class ImageWebpService(MediaPaths media, ILogger<ImageWebpService> logger) : IImageWebpService
{
    public const int MaxImageBytes = 10 * 1024 * 1024;
    private const int MaxDimension = 1920;

    private static readonly HttpClient Http = new(new SocketsHttpHandler
    {
        AllowAutoRedirect = false,
        ConnectTimeout = TimeSpan.FromSeconds(5),
    })
    {
        Timeout = TimeSpan.FromSeconds(10),
        MaxResponseContentBufferSize = MaxImageBytes,
    };

    [GeneratedRegex(@"!\[([^\]]*)\]\(([^)\s]+)\)", RegexOptions.Compiled)]
    private static partial Regex MarkdownImageRegex();

    public string? DetectMimeType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
            return "image/jpeg";

        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (bytes.Length >= 8 && bytes[..8].SequenceEqual(png))
            return "image/png";

        if (bytes.Length >= 12
            && bytes[..4].SequenceEqual("RIFF"u8)
            && bytes[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";

        return null;
    }

    public async Task<byte[]?> ConvertToWebpAsync(byte[] inputBytes, CancellationToken ct = default)
    {
        if (inputBytes is null || inputBytes.Length == 0 || inputBytes.Length > MaxImageBytes)
            return null;

        var mime = DetectMimeType(inputBytes);
        if (mime is null)
            return null;

        try
        {
            using var inStream = new MemoryStream(inputBytes);
            using var image = await Image.LoadAsync(inStream, ct);

            if (image.Width > MaxDimension || image.Height > MaxDimension)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(MaxDimension, MaxDimension),
                }));
            }

            using var outStream = new MemoryStream();
            await image.SaveAsWebpAsync(outStream, new WebpEncoder { Quality = 82 }, ct);
            return outStream.ToArray();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Görsel WebP biçimine dönüştürülemedi.");
            return null;
        }
    }

    public async Task<string> SaveWebpAsync(byte[] webpBytes, string subFolder, CancellationToken ct = default)
    {
        var safeFolder = string.IsNullOrWhiteSpace(subFolder) ? "misc" : subFolder.Trim('/');
        var uploadDir = Path.Combine(media.UserPhotosRoot, safeFolder);
        Directory.CreateDirectory(uploadDir);

        var fileName = $"{Guid.NewGuid():N}.webp";
        await File.WriteAllBytesAsync(Path.Combine(uploadDir, fileName), webpBytes, ct);
        return $"{MediaPaths.UserPhotosRequestPath}/{safeFolder}/{fileName}";
    }

    public async Task<string?> NormalizeBlogImageAsync(string? rawUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawUrl))
            return null;

        var trimmed = rawUrl.Trim();
        if (trimmed.Length > 2_000_000)
            return null;

        // Yerel WebP görselleri olduğu gibi koru
        if ((trimmed.StartsWith("/blog_backgrounds/", StringComparison.Ordinal) ||
             trimmed.StartsWith("/media/", StringComparison.Ordinal)) &&
            !trimmed.Contains("..", StringComparison.Ordinal) &&
            trimmed.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        // Data URL (ör. data:image/png;base64,...) -> WebP olarak kaydet
        if (trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            var commaIdx = trimmed.IndexOf(',');
            if (commaIdx <= 0) return null;
            try
            {
                var rawBytes = Convert.FromBase64String(trimmed[(commaIdx + 1)..]);
                var webp = await ConvertToWebpAsync(rawBytes, ct);
                if (webp is null) return null;
                return await SaveWebpAsync(webp, "blogs", ct);
            }
            catch
            {
                return null;
            }
        }

        // Harici http/https görsel adresi -> indir, WebP'ye çevir ve yerel olarak sakla
        if (trimmed.Length <= 2000 &&
            Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
        {
            var downloaded = await DownloadPublicImageBytesAsync(uri, ct);
            if (downloaded is not null)
            {
                var webp = await ConvertToWebpAsync(downloaded, ct);
                if (webp is not null)
                    return await SaveWebpAsync(webp, "blogs", ct);
            }
        }

        return null;
    }

    public async Task<string> NormalizeMarkdownImagesAsync(string markdownBody, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(markdownBody))
            return markdownBody;

        var matches = MarkdownImageRegex().Matches(markdownBody);
        if (matches.Count == 0)
            return markdownBody;

        var replacements = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (Match m in matches)
        {
            var rawImgUrl = m.Groups[2].Value.Trim();
            if (replacements.ContainsKey(rawImgUrl))
                continue;

            if (rawImgUrl.StartsWith("/blog_backgrounds/", StringComparison.Ordinal) ||
                rawImgUrl.StartsWith("/media/", StringComparison.Ordinal))
            {
                continue;
            }

            var localWebp = await NormalizeBlogImageAsync(rawImgUrl, ct);
            if (!string.IsNullOrWhiteSpace(localWebp))
            {
                replacements[rawImgUrl] = localWebp;
            }
        }

        if (replacements.Count == 0)
            return markdownBody;

        return MarkdownImageRegex().Replace(markdownBody, m =>
        {
            var alt = m.Groups[1].Value;
            var url = m.Groups[2].Value.Trim();
            return replacements.TryGetValue(url, out var nextUrl)
                ? $"![{alt}]({nextUrl})"
                : m.Value;
        });
    }

    private async Task<byte[]?> DownloadPublicImageBytesAsync(Uri uri, CancellationToken ct)
    {
        try
        {
            var addresses = await Dns.GetHostAddressesAsync(uri.DnsSafeHost, ct);
            if (addresses.Length == 0) return null;
            foreach (var ip in addresses)
            {
                if (IsPrivateOrReservedIp(ip))
                    return null;
            }

            using var req = new HttpRequestMessage(HttpMethod.Get, uri);
            req.Headers.UserAgent.ParseAdd("ParfumetreImageFetcher/1.0");
            using var res = await Http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!res.IsSuccessStatusCode) return null;

            await using var stream = await res.Content.ReadAsStreamAsync(ct);
            using var ms = new MemoryStream();
            var buffer = new byte[16 * 1024];
            int read;
            while ((read = await stream.ReadAsync(buffer, ct)) > 0)
            {
                if (ms.Length + read > MaxImageBytes)
                    return null;
                ms.Write(buffer, 0, read);
            }
            return ms.ToArray();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Harici blog görseli indirilemedi: {Uri}", uri);
            return null;
        }
    }

    private static bool IsPrivateOrReservedIp(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip) || ip.Equals(IPAddress.Any) || ip.Equals(IPAddress.IPv6Any) || ip.Equals(IPAddress.IPv6None))
            return true;

        if (ip.IsIPv4MappedToIPv6)
            ip = ip.MapToIPv4();

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = ip.GetAddressBytes();
            if (b[0] == 10 || b[0] == 127 || b[0] == 0) return true;
            if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true;
            if (b[0] == 192 && b[1] == 168) return true;
            if (b[0] == 169 && b[1] == 254) return true;
            if (b[0] == 100 && b[1] >= 64 && b[1] <= 127) return true;
            return false;
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast) return true;
            var b = ip.GetAddressBytes();
            if ((b[0] & 0xFE) == 0xFC) return true; // fc00::/7 Unique Local
        }

        return false;
    }
}

