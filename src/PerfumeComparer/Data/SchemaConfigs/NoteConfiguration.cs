using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.Property(n => n.Name).HasMaxLength(150);
        builder.Property(n => n.Slug).HasMaxLength(180);
        builder.Property(n => n.Category).HasMaxLength(60);

        builder.HasIndex(n => n.Slug).IsUnique();
        builder.HasIndex(n => n.Name).IsUnique();
    }
}
