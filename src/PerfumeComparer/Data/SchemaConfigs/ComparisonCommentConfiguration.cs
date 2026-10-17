using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class ComparisonCommentConfiguration : IEntityTypeConfiguration<ComparisonComment>
{
    public void Configure(EntityTypeBuilder<ComparisonComment> builder)
    {
        builder.Property(c => c.Body).HasMaxLength(ComparisonComment.MaxBodyLength);
        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.CreatedAt).HasDefaultValueSql("now()");

        // Çift daima normalize saklandığı için (p1,p2) üzerinden sorgulamak yeterli.
        builder.HasIndex(c => new { c.Perfume1Id, c.Perfume2Id });

        // Çift başına her AI türünden (analiz / yorum özeti) tek kayıt. Var olan
        // veritabanlarında bu index SeedService.EnsureLateAddedTablesAsync ile kurulur.
        builder.HasIndex(c => new { c.Perfume1Id, c.Perfume2Id, c.AiKind }, "ux_comparison_comments_ai_summary_kind")
            .IsUnique()
            .HasFilter("is_ai_summary")
            .HasDatabaseName("ux_comparison_comments_ai_summary_kind");

        builder.HasOne(c => c.Perfume1)
            .WithMany()
            .HasForeignKey(c => c.Perfume1Id)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Perfume2)
            .WithMany()
            .HasForeignKey(c => c.Perfume2Id)
            .OnDelete(DeleteBehavior.Restrict);

        // AI özetlerinin yazarı yok
        builder.HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
