using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeDupeConfiguration : IEntityTypeConfiguration<PerfumeDupe>
{
    public void Configure(EntityTypeBuilder<PerfumeDupe> builder)
    {
        builder.HasKey(pd => pd.Id);

        builder.Property(pd => pd.ProductCode).HasMaxLength(50);
        builder.Property(pd => pd.Url).HasMaxLength(500);

        builder.HasOne(pd => pd.Perfume)
            .WithMany(p => p.Dupes)
            .HasForeignKey(pd => pd.PerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pd => pd.DupeBrand)
            .WithMany(b => b.Dupes)
            .HasForeignKey(pd => pd.DupeBrandId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(pd => pd.PerfumeId);
        builder.HasIndex(pd => pd.DupeBrandId);
    }
}
