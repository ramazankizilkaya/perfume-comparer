using System;

namespace PerfumeComparer.Domain.Entities;

public class PerfumeView
{
    public long Id { get; set; }
    public int PerfumeId { get; set; }
    public Perfume Perfume { get; set; } = null!;
    public required string IpAddress { get; set; }
    public DateTimeOffset ViewedAt { get; set; } = DateTimeOffset.UtcNow;
}
