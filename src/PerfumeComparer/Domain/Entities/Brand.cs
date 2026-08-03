namespace PerfumeComparer.Domain.Entities;

public class Brand
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? Country { get; set; }
    public string? Description { get; set; }

    /// <summary>Yerel logo yolu, örn: <c>/media/brands/chanel.webp</c>.</summary>
    public string? LogoUrl { get; set; }

    /// <summary>Markanın ana faaliyet alanı ("Fashion", "Niche Perfumery" gibi).</summary>
    public string? MainActivity { get; set; }

    /// <summary>Markanın resmi web sitesi.</summary>
    public string? WebsiteUrl { get; set; }

    /// <summary>Bağlı olduğu ana şirket.</summary>
    public string? ParentCompany { get; set; }

    /// <summary>Verinin çekildiği kaynak sayfa.</summary>
    public string? SourceUrl { get; set; }

    /// <summary>Yayınlanmış parfüm sayısı; her içe aktarımda yeniden hesaplanır.</summary>
    public int PerfumeCount { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<Perfume> Perfumes { get; set; } = [];
}
