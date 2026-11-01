using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class ComparisonVoteConfiguration : IEntityTypeConfiguration<ComparisonVote>
{
    public void Configure(EntityTypeBuilder<ComparisonVote> builder)
    {
        builder.Property(v => v.VoterKey).HasMaxLength(ComparisonVote.MaxVoterKeyLength);
        builder.Property(v => v.CreatedAt).HasDefaultValueSql("now()");

        // Seçmen başına çift için tek oy. Var olan veritabanlarında bu index
        // SeedService.EnsureLateAddedTablesAsync ile kurulur.
        builder.HasIndex(v => new { v.FirstPerfumeId, v.SecondPerfumeId, v.VoterKey })
            .IsUnique()
            .HasDatabaseName("ux_comparison_votes_pair_voter");

        builder.HasOne(v => v.FirstPerfume)
            .WithMany()
            .HasForeignKey(v => v.FirstPerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.SecondPerfume)
            .WithMany()
            .HasForeignKey(v => v.SecondPerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Perfume>()
            .WithMany()
            .HasForeignKey(v => v.PreferredPerfumeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
