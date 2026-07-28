using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace PerfumeComparer.Data;

/// <summary>Bir tohumlama adımının sonucu.</summary>
public record SeedStepResult(string Key, string Label, bool Ok, string Message, int Count);

/// <summary>Yönetim ekranındaki bir satır: şema, ne içerdiği ve kaç kayıt olduğu.</summary>
public record SeedStatusItem(string Key, string Label, string Description, string Requires, int Count);

/// <summary>
/// Tohumlama artık otomatik değil: uygulama açılışında sadece şema kurulur,
/// veriyi /admin ekranından adım adım (ya da hepsini birden) basarsınız.
/// </summary>
public interface ISeedService
{
    /// <summary>Veritabanı/şema yoksa oluşturur ve arama altyapısını kurar. Veri basmaz.</summary>
    Task EnsureSchemaAsync(CancellationToken ct = default);

    /// <summary>Tohumlanabilir şemalar ve mevcut kayıt sayıları.</summary>
    Task<IReadOnlyList<SeedStatusItem>> GetStatusAsync(CancellationToken ct = default);

    /// <summary>Tek bir şemayı tohumlar (anahtarlar için <see cref="GetStatusAsync"/>).</summary>
    Task<SeedStepResult> SeedStepAsync(string key, CancellationToken ct = default);

    /// <summary>Tüm şemaları bağımlılık sırasına göre tohumlar.</summary>
    Task<IReadOnlyList<SeedStepResult>> SeedAllAsync(CancellationToken ct = default);

    /// <summary>Veritabanını siler ve boş şemayı yeniden kurar (veri basmaz).</summary>
    Task ResetAsync(CancellationToken ct = default);
}
