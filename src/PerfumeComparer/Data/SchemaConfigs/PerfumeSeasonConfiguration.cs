using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeSeasonConfiguration : IEntityTypeConfiguration<PerfumeSeason>
{
    public void Configure(EntityTypeBuilder<PerfumeSeason> builder)
    {
        builder.HasKey(ps => new { ps.PerfumeId, ps.Season });

        builder.Property(ps => ps.Season).HasConversion<string>().HasMaxLength(20);

        builder.HasOne(ps => ps.Perfume)
            .WithMany(p => p.Seasons)
            .HasForeignKey(ps => ps.PerfumeId);
    }
}
