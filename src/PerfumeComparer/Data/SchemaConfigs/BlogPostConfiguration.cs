using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class BlogPostConfiguration : IEntityTypeConfiguration<BlogPost>
{
    public void Configure(EntityTypeBuilder<BlogPost> builder)
    {
        builder.Property(b => b.Title).HasMaxLength(200);
        builder.Property(b => b.Slug).HasMaxLength(220);
        builder.Property(b => b.Excerpt).HasMaxLength(500);
        builder.Property(b => b.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(b => b.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(b => b.UpdatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(b => b.Slug).IsUnique();
        builder.HasIndex(b => new { b.Status, b.PublishedAt });

        // Yazar silinse de içerik kalmalı
        builder.HasOne(b => b.Author)
            .WithMany()
            .HasForeignKey(b => b.AuthorUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
