using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Diskteki medya klasörlerinin tek kaynağı. Program.cs bu yolları /media altından
/// servis eder, fotoğraf yükleme ucu da aynı yollara yazar; iki yerde ayrı ayrı
/// hesaplanmaz.
/// </summary>
public sealed class MediaPaths
{
    /// <summary>Scrape edilen marka/parfüm görselleri (<c>Media:Root</c>, varsayılan ../../scrape_files).</summary>
    public string ScrapeRoot { get; }

    /// <summary>
    /// Kullanıcı fotoğrafları (<c>Media:UserPhotosRoot</c>). Varsayılan olarak repo
    /// kökünde, scrape_files'ın DIŞINDA bir <c>user-photos</c> klasörü; git'e girmez
    /// ve yeniden kurulumda silinmez. /media/user-photos/... olarak servis edilir.
    /// </summary>
    public string UserPhotosRoot { get; }

    public const string UserPhotosRequestPath = "/media/user-photos";

    public MediaPaths(IConfiguration config, IWebHostEnvironment env)
    {
        ScrapeRoot = Path.GetFullPath(Path.Combine(
            env.ContentRootPath, config["Media:Root"] ?? "../../scrape_files"));
        UserPhotosRoot = Path.GetFullPath(Path.Combine(
            env.ContentRootPath, config["Media:UserPhotosRoot"] ?? "../../user-photos"));
    }
}
