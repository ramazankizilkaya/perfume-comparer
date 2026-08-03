using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Data.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Perfume> Perfumes => Set<Perfume>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Accord> Accords => Set<Accord>();
    public DbSet<PerfumeAccord> PerfumeAccords => Set<PerfumeAccord>();
    public DbSet<PerfumeNote> PerfumeNotes => Set<PerfumeNote>();
    public DbSet<PerfumeSeason> PerfumeSeasons => Set<PerfumeSeason>();
    public DbSet<PerfumeAgeGroup> PerfumeAgeGroups => Set<PerfumeAgeGroup>();
    public DbSet<PerfumeUsage> PerfumeUsages => Set<PerfumeUsage>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<PerfumeComment> PerfumeComments => Set<PerfumeComment>();
    public DbSet<ComparisonComment> ComparisonComments => Set<ComparisonComment>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<DupeBrand> DupeBrands => Set<DupeBrand>();
    public DbSet<PerfumeDupe> PerfumeDupes => Set<PerfumeDupe>();
    public DbSet<PerfumeAlternative> PerfumeAlternatives => Set<PerfumeAlternative>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Fuzzy arama (pg_trgm) ve Türkçe karakter toleransı (unaccent) için
        modelBuilder.HasPostgresExtension("pg_trgm");
        modelBuilder.HasPostgresExtension("unaccent");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
