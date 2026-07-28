using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class RatingConfiguration : IEntityTypeConfiguration<Rating>
{
    public void Configure(EntityTypeBuilder<Rating> builder)
    {
        builder.HasKey(r => new { r.UserId, r.PerfumeId });

        // avg_rating hesaplaması parfüme göre tarar
        builder.HasIndex(r => r.PerfumeId);

        builder.ToTable(t => t.HasCheckConstraint("ck_ratings_score", "score BETWEEN 1 AND 5"));
    }
}
