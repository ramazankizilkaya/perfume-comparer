namespace PerfumeComparer.Domain.Entities;

public class UserPerfumeRecommendation
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public string PromptJson { get; set; } = "";
    public string PerfumerAdvice { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}
