using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeUsageConfiguration : IEntityTypeConfiguration<PerfumeUsage>
{
    public void Configure(EntityTypeBuilder<PerfumeUsage> builder)
    {
        builder.Property(u => u.AgeGroup).HasConversion<string>().HasMaxLength(20);
        builder.Property(u => u.CreatedAt).HasDefaultValueSql("now()");

        builder.HasOne(u => u.Perfume)
            .WithMany(p => p.Usages)
            .HasForeignKey(u => u.PerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(u => u.User)
            .WithMany()
            .HasForeignKey(u => u.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Girişli kullanıcı bir parfüm için yalnızca bir kez "kullanıyorum" diyebilir.
        builder.HasIndex(u => new { u.PerfumeId, u.UserId })
            .IsUnique()
            .HasFilter("user_id IS NOT NULL");
    }
}
