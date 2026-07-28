namespace PerfumeComparer.Domain.Entities;

public class AppUser
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public string? DisplayName { get; set; }

    /// <summary>Google OAuth "sub" claim'i.</summary>
    public string? GoogleSubjectId { get; set; }

    public string? AvatarUrl { get; set; }
    public UserRole Role { get; set; } = UserRole.User;
    public DateTimeOffset CreatedAt { get; set; }
}
