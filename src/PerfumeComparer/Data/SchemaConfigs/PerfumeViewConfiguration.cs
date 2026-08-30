using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeViewConfiguration : IEntityTypeConfiguration<PerfumeView>
{
    public void Configure(EntityTypeBuilder<PerfumeView> builder)
    {
        builder.Property(v => v.IpAddress).HasMaxLength(45);
        builder.HasIndex(v => new { v.PerfumeId, v.IpAddress }).IsUnique();
        builder.HasOne(v => v.Perfume)
            .WithMany()
            .HasForeignKey(v => v.PerfumeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
