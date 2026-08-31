using System;

namespace PerfumeComparer.Domain.Entities;

public class PerfumeUserPhoto
{
    public int Id { get; set; }
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public required string ImageUrl { get; set; }
    public bool IsApproved { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
