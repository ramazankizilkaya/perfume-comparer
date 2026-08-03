using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeAccordConfiguration : IEntityTypeConfiguration<PerfumeAccord>
{
    public void Configure(EntityTypeBuilder<PerfumeAccord> builder)
    {
        builder.HasKey(pa => new { pa.PerfumeId, pa.AccordId });

        builder.Property(pa => pa.Width).HasPrecision(5, 2);

        builder.HasOne(pa => pa.Perfume)
            .WithMany(p => p.Accords)
            .HasForeignKey(pa => pa.PerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pa => pa.Accord)
            .WithMany(a => a.Perfumes)
            .HasForeignKey(pa => pa.AccordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(pa => pa.AccordId);
    }
}
