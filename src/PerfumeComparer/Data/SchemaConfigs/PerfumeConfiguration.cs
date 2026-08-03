using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeConfiguration : IEntityTypeConfiguration<Perfume>
{
    public void Configure(EntityTypeBuilder<Perfume> builder)
    {
        builder.Property(p => p.Name).HasMaxLength(200);
        builder.Property(p => p.Slug).HasMaxLength(240);
        builder.Property(p => p.SourceUrl).HasMaxLength(500);
        builder.Property(p => p.ImageUrl).HasMaxLength(300);
        builder.Property(p => p.Gender).HasConversion<string>().HasMaxLength(10);

        // Sabit lookup'lar enum; okunabilir olsun diye string olarak saklanır.
        builder.Property(p => p.Concentration).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.FragranceFamily).HasConversion<string>().HasMaxLength(20);

        builder.Property(p => p.AvgRating).HasPrecision(3, 2);
        builder.Property(p => p.UserAvgRating).HasPrecision(3, 2);
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(p => p.UpdatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(p => p.Slug).IsUnique();
        builder.HasIndex(p => p.BrandId);

        // Filtre panelinin ana kombinasyonu
        builder.HasIndex(p => new { p.Gender, p.Concentration, p.ReleaseYear });

        // Marka sayfasının varsayılan sıralaması (marka + popülerlik)
        builder.HasIndex(p => new { p.BrandId, p.RatingCount });

        builder.HasIndex(p => p.Name)
            .HasMethod("gin")
            .HasOperators("gin_trgm_ops")
            .HasDatabaseName("ix_perfumes_name_trgm");

        builder.HasOne(p => p.Brand)
            .WithMany(b => b.Perfumes)
            .HasForeignKey(p => p.BrandId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
