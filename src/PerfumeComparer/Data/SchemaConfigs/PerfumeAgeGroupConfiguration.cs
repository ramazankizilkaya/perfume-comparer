using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeAgeGroupConfiguration : IEntityTypeConfiguration<PerfumeAgeGroup>
{
    public void Configure(EntityTypeBuilder<PerfumeAgeGroup> builder)
    {
        builder.HasKey(pa => new { pa.PerfumeId, pa.AgeGroup });

        builder.Property(pa => pa.AgeGroup).HasConversion<string>().HasMaxLength(20);

        builder.HasOne(pa => pa.Perfume)
            .WithMany(p => p.AgeGroups)
            .HasForeignKey(pa => pa.PerfumeId);
    }
}
