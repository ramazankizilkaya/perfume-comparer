using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class DupeBrandConfiguration : IEntityTypeConfiguration<DupeBrand>
{
    public void Configure(EntityTypeBuilder<DupeBrand> builder)
    {
        builder.HasKey(db => db.Id);

        builder.Property(db => db.Name).HasMaxLength(100).IsRequired();
        builder.Property(db => db.Slug).HasMaxLength(100).IsRequired();
        builder.Property(db => db.OfficialUrl).HasMaxLength(500);
        builder.Property(db => db.LogoUrl).HasMaxLength(500);

        builder.HasIndex(db => db.Slug).IsUnique();
    }
}
