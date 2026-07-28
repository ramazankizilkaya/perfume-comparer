namespace PerfumeComparer.Domain.Entities;

public class Favorite
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
}
