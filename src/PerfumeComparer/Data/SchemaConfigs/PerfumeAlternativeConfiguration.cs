using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeAlternativeConfiguration : IEntityTypeConfiguration<PerfumeAlternative>
{
    public void Configure(EntityTypeBuilder<PerfumeAlternative> builder)
    {
        builder.HasKey(pa => new { pa.SourcePerfumeId, pa.TargetPerfumeId, pa.Kind });

        builder.Property(pa => pa.Kind).HasConversion<string>().HasMaxLength(20);
        builder.Property(pa => pa.Note).HasMaxLength(500);
        builder.Property(pa => pa.CreatedAt).HasDefaultValueSql("now()");

        builder.HasOne(pa => pa.SourcePerfume)
            .WithMany(p => p.AlternativesAsSource)
            .HasForeignKey(pa => pa.SourcePerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pa => pa.TargetPerfume)
            .WithMany(p => p.AlternativesAsTarget)
            .HasForeignKey(pa => pa.TargetPerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(pa => pa.TargetPerfumeId);
    }
}
