using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeCommentConfiguration : IEntityTypeConfiguration<PerfumeComment>
{
    public void Configure(EntityTypeBuilder<PerfumeComment> builder)
    {
        builder.Property(c => c.Body).HasMaxLength(4000);
        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.CreatedAt).HasDefaultValueSql("now()");

        // Detay sayfası onaylı yorumları tarihe göre listeler; admin pending kuyruğunu tarar
        builder.HasIndex(c => new { c.PerfumeId, c.Status, c.CreatedAt });
        builder.HasIndex(c => c.Status);

        // Parfüm başına tek AI özeti; arka plan işi varsa günceller, yoksa ekler.
        builder.HasIndex(c => c.PerfumeId)
            .IsUnique()
            .HasFilter("is_ai_summary")
            .HasDatabaseName("ux_perfume_comments_ai_summary");

        builder.HasOne(c => c.Perfume)
            .WithMany()
            .HasForeignKey(c => c.PerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        // AI özetlerinin yazarı yok
        builder.HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
