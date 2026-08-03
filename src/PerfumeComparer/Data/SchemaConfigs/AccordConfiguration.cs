using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class AccordConfiguration : IEntityTypeConfiguration<Accord>
{
    public void Configure(EntityTypeBuilder<Accord> builder)
    {
        builder.Property(a => a.Name).HasMaxLength(80);
        builder.Property(a => a.Slug).HasMaxLength(100);

        builder.HasIndex(a => a.Slug).IsUnique();
        builder.HasIndex(a => a.Name).IsUnique();
    }
}
