using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.SchemaConfigs;

public class ContactMessageConfiguration : IEntityTypeConfiguration<ContactMessage>
{
    public void Configure(EntityTypeBuilder<ContactMessage> builder)
    {
        builder.Property(m => m.Name).HasMaxLength(ContactMessage.MaxNameLength);
        builder.Property(m => m.Email).HasMaxLength(ContactMessage.MaxEmailLength);
        builder.Property(m => m.Message).HasMaxLength(ContactMessage.MaxMessageLength);
        builder.Property(m => m.IpAddress).HasMaxLength(45);
        builder.Property(m => m.CreatedAt).HasDefaultValueSql("now()");

        // Var olan veritabanlarında tablo ve index'ler SeedService.EnsureLateAddedTablesAsync ile kurulur.
        builder.HasIndex(m => m.CreatedAt).HasDatabaseName("ix_contact_messages_created_at");
        builder.HasIndex(m => new { m.IpAddress, m.CreatedAt }).HasDatabaseName("ix_contact_messages_ip_address_created_at");
    }
}
