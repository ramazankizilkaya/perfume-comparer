namespace PerfumeComparer.Business.Dtos;

public class PerfumeSearchRow
{
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public required string BrandName { get; set; }
    public required string BrandSlug { get; set; }
    public required string Gender { get; set; }
    // Ham enum adları ("Edp" / "Floral"); etiket ve slug bunlardan türetilir.
    public string? Concentration { get; set; }
    public string? FragranceFamily { get; set; }
    public string? ImageUrl { get; set; }
    public decimal AvgRating { get; set; }
    public int RatingCount { get; set; }
    public double Score { get; set; }
}
