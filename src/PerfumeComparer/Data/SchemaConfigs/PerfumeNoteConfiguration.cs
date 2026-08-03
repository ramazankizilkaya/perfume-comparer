using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class PerfumeNoteConfiguration : IEntityTypeConfiguration<PerfumeNote>
{
    public void Configure(EntityTypeBuilder<PerfumeNote> builder)
    {
        builder.HasKey(pn => new { pn.PerfumeId, pn.NoteId, pn.Layer });

        builder.Property(pn => pn.Layer).HasConversion<string>().HasMaxLength(10);

        builder.HasOne(pn => pn.Perfume)
            .WithMany(p => p.Notes)
            .HasForeignKey(pn => pn.PerfumeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pn => pn.Note)
            .WithMany(n => n.Perfumes)
            .HasForeignKey(pn => pn.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        // Nota bazlı filtre/landing sayfaları için ("oud notalı parfümler")
        builder.HasIndex(pn => pn.NoteId);
    }
}
