using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;
using PerfumeComparer.Data.Persistence;

namespace PerfumeComparer.Data;

/// <summary>
/// Şemaları tek tek tohumlar. Otomatik çalışmaz; /admin ekranından tetiklenir.
/// Her adım idempotenttir: zaten dolu olan şemayı atlar.
/// </summary>
public partial class SeedService(
    AppDbContext db,
    IWebHostEnvironment env,
    IConfiguration configuration,
    ILogger<SeedService> logger) : ISeedService
{
    [GeneratedRegex(@"(\d+)\s*ML", RegexOptions.IgnoreCase)]
    private static partial Regex SizeRegex();

    /// <summary>Adım sırası = bağımlılık sırası. "Hepsini tohumla" bu sırayla çalışır.</summary>
    private static readonly (string Key, string Label, string Description, string Requires)[] Steps =
    [
        ("katalog", "Katalog", "Markalar, parfümler, notalar, mevsim ve yaş grubu skorları", ""),
        ("kullanicilar", "Kullanıcılar", "Yorum ve blog yazarı olarak kullanılan örnek hesaplar", ""),
        ("bloglar", "Blog yazıları", "Koku rehberi yazıları", "kullanicilar"),
        ("yorumlar", "Parfüm yorumları", "Kullanıcı yorumları + puanlar (ortalama puanı da günceller)", "katalog, kullanicilar"),
        ("karsilastirma-yorumlari", "Karşılaştırma yorumları", "İki parfüm hakkındaki tartışmalar", "katalog, kullanicilar"),
    ];

    // ---------------------------------------------------------------- şema

    public async Task EnsureSchemaAsync(CancellationToken ct = default)
    {
        await db.Database.EnsureCreatedAsync(ct);
        await EnsureSearchSupportAsync(ct);
    }

    public async Task ResetAsync(CancellationToken ct = default)
    {
        logger.LogInformation("Veritabanı siliniyor ve boş şema yeniden kuruluyor...");
        await db.Database.EnsureDeletedAsync(ct);
        await EnsureSchemaAsync(ct);
    }

    /// <summary>
    /// Arama için gereken IMMUTABLE unaccent sarmalayıcısı ve trigram expression index'leri.
    /// EnsureCreated modeldeki uzantı/index'leri kurar; bunlar ham SQL olduğundan burada, idempotent.
    /// </summary>
    private async Task EnsureSearchSupportAsync(CancellationToken ct)
    {
        await db.Database.ExecuteSqlRawAsync("""
            CREATE OR REPLACE FUNCTION f_unaccent(input text)
            RETURNS text
            LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
            AS $func$ SELECT public.unaccent('public.unaccent'::regdictionary, input) $func$;
            """, ct);

        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_perfumes_name_unaccent_trgm ON perfumes USING gin (f_unaccent(lower(name)) gin_trgm_ops);", ct);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_brands_name_unaccent_trgm ON brands USING gin (f_unaccent(lower(name)) gin_trgm_ops);", ct);
    }

    // -------------------------------------------------------------- durum

    public async Task<IReadOnlyList<SeedStatusItem>> GetStatusAsync(CancellationToken ct = default)
    {
        await EnsureSchemaAsync(ct);

        var counts = new Dictionary<string, int>
        {
            ["katalog"] = await db.Perfumes.CountAsync(ct),
            ["kullanicilar"] = await db.Users.CountAsync(ct),
            ["bloglar"] = await db.BlogPosts.CountAsync(ct),
            ["yorumlar"] = await db.PerfumeComments.CountAsync(ct),
            ["karsilastirma-yorumlari"] = await db.ComparisonComments.CountAsync(ct),
        };

        return Steps
            .Select(s => new SeedStatusItem(s.Key, s.Label, s.Description, s.Requires, counts[s.Key]))
            .ToList();
    }

    // ------------------------------------------------------------ adımlar

    public async Task<SeedStepResult> SeedStepAsync(string key, CancellationToken ct = default)
    {
        await EnsureSchemaAsync(ct);

        var step = Steps.FirstOrDefault(s => s.Key == key);
        if (step.Key is null)
            return new SeedStepResult(key, key, false, "Bilinmeyen şema.", 0);

        return key switch
        {
            "katalog" => await SeedCatalogAsync(ct),
            "kullanicilar" => await SeedUsersAsync(ct),
            "bloglar" => await SeedBlogPostsAsync(ct),
            "yorumlar" => await SeedPerfumeCommentsAsync(ct),
            "karsilastirma-yorumlari" => await SeedComparisonCommentsAsync(ct),
            _ => new SeedStepResult(key, step.Label, false, "Bilinmeyen şema.", 0),
        };
    }

    public async Task<IReadOnlyList<SeedStepResult>> SeedAllAsync(CancellationToken ct = default)
    {
        var results = new List<SeedStepResult>();
        foreach (var step in Steps)
            results.Add(await SeedStepAsync(step.Key, ct));
        return results;
    }

    private async Task<SeedStepResult> SeedCatalogAsync(CancellationToken ct)
    {
        const string key = "katalog";
        const string label = "Katalog";

        if (await db.Perfumes.AnyAsync(ct))
            return new SeedStepResult(key, label, true, "Zaten dolu, atlandı.", await db.Perfumes.CountAsync(ct));

        var seedPath = Path.GetFullPath(Path.Combine(
            env.ContentRootPath,
            configuration["SeedData:PerfumesJson"] ?? "../../docs/perfumes.json"));

        var metaPath = Path.GetFullPath(Path.Combine(
            env.ContentRootPath,
            configuration["SeedData:MetaJson"] ?? "Data/SeedData/seed-meta.json"));

        if (!File.Exists(seedPath))
            return new SeedStepResult(key, label, false, $"Katalog dosyası bulunamadı: {seedPath}", 0);
        if (!File.Exists(metaPath))
            return new SeedStepResult(key, label, false, $"Meta dosyası bulunamadı: {metaPath}", 0);

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

        var meta = JsonSerializer.Deserialize<SeedMeta>(await File.ReadAllTextAsync(metaPath, ct), jsonOptions)
            ?? new SeedMeta([], [], []);

        var rows = JsonSerializer.Deserialize<List<SeedRow>>(await File.ReadAllTextAsync(seedPath, ct), jsonOptions)
            ?? [];

        // Nota, konsantrasyon, koku ailesi, mevsim ve yaş grubu enum — tablo tohumlanmaz.
        var allNotes = Enum.GetValues<Note>();
        var allSeasons = Enum.GetValues<Season>();
        var allAgeGroups = Enum.GetValues<AgeGroup>();

        var brands = meta.Brands
            .Select(b => new Brand
            {
                Name = b.Name,
                Slug = SlugHelper.Slugify(b.Name),
                Country = b.Country,
                Description = b.Description,
                LogoUrl = b.LogoUrl,
            })
            .ToDictionary(b => b.Name, StringComparer.OrdinalIgnoreCase);
        db.Brands.AddRange(brands.Values);

        var perfumes = new Dictionary<string, Perfume>();
        var familyFallback = 0;
        var concentrationFallback = 0;

        foreach (var row in rows)
        {
            var brandName = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(row.Brand.ToLowerInvariant());
            if (!brands.TryGetValue(brandName, out var brand))
            {
                brand = new Brand { Name = brandName, Slug = SlugHelper.Slugify(brandName) };
                brands[brandName] = brand;
                db.Brands.Add(brand);
            }

            var (cleanName, concentrationName, _) = ParseName(row.Name, brandName, meta.ConcentrationTokens);

            // Her parfümün bir konsantrasyonu olmalı: URL ve breadcrumb seviyeleri
            // aksi halde parfümden parfüme değişiyor (kadın/erkek sayfaları farklı görünüyordu).
            var concentration = Lookups.ConcentrationFromName(concentrationName)
                ?? FallbackConcentration(concentrationFallback++);

            var slug = SlugHelper.Slugify($"{brand.Slug} {cleanName} {concentration.Slug()}");
            if (!perfumes.ContainsKey(slug))
            {
                var perfume = new Perfume
                {
                    Brand = brand,
                    Name = cleanName,
                    Slug = slug,
                    Gender = ParseGender(row.Gender, row.Name),
                    Concentration = concentration,
                    FragranceFamily = ResolveFamily(row.Name, meta.FragranceFamilyRules, familyFallback++),
                    ImageUrl = row.ImageUrl,
                    IsPublished = true,
                };
                perfumes[slug] = perfume;
                db.Perfumes.Add(perfume);
            }
        }

        var i = 0;
        foreach (var perfume in perfumes.Values)
        {
            // Her katmana birden fazla, katmanlar arası çakışmayan nota ekle.
            void AddNotes(NoteLayer layer, params int[] offsets)
            {
                foreach (var off in offsets)
                {
                    var note = allNotes[(i + off) % allNotes.Length];
                    if (!perfume.Notes.Any(n => n.Note == note))
                        perfume.Notes.Add(new PerfumeNote { Note = note, Layer = layer });
                }
            }
            AddNotes(NoteLayer.Top, 0, 1, 6);
            AddNotes(NoteLayer.Middle, 3, 8, 11);
            AddNotes(NoteLayer.Base, 5, 10, 13);

            // Tüm mevsim ve yaş gruplarına puan ver; barlar tek satır değil dolu görünsün.
            for (var s = 0; s < allSeasons.Length; s++)
                perfume.Seasons.Add(new PerfumeSeason { Season = allSeasons[s], Score = (short)(45 + (i * 7 + s * 13) % 55) });
            for (var a = 0; a < allAgeGroups.Length; a++)
                perfume.AgeGroups.Add(new PerfumeAgeGroup { AgeGroup = allAgeGroups[a], Score = (short)(40 + (i * 5 + a * 17) % 55) });

            perfume.ReleaseYear = 2015 + (i % 11);
            perfume.Description = BuildDescription(perfume);
            i++;
        }

        await db.SaveChangesAsync(ct);

        // Muadil Markalar ve Örnek Muadil Seed Verisi
        var dupeBrands = new List<DupeBrand>
        {
            new() { Name = "MAD Parfüm", Slug = "mad-parfum", OfficialUrl = "https://www.madparfum.com" },
            new() { Name = "Bargello", Slug = "bargello", OfficialUrl = "https://www.bargello.com.tr" },
            new() { Name = "Muscent", Slug = "muscent", OfficialUrl = "https://www.muscent.com.tr" },
        };
        db.DupeBrands.AddRange(dupeBrands);
        await db.SaveChangesAsync(ct);

        var samplePerfume = perfumes.Values.FirstOrDefault();
        if (samplePerfume is not null)
        {
            db.PerfumeDupes.AddRange(new[]
            {
                new PerfumeDupe { PerfumeId = samplePerfume.Id, DupeBrandId = dupeBrands[0].Id, ProductCode = "E101", Url = "https://www.madparfum.com", SimilarityRate = 90 },
                new PerfumeDupe { PerfumeId = samplePerfume.Id, DupeBrandId = dupeBrands[1].Id, ProductCode = "561", Url = "https://www.bargello.com.tr", SimilarityRate = 85 },
            });
            await db.SaveChangesAsync(ct);
        }

        logger.LogInformation("Katalog tohumlandı: {Brands} marka, {Perfumes} parfüm", brands.Count, perfumes.Count);

        return new SeedStepResult(key, label, true,
            $"{brands.Count} marka, {perfumes.Count} parfüm eklendi.", perfumes.Count);
    }

    private async Task<SeedStepResult> SeedUsersAsync(CancellationToken ct)
    {
        const string key = "kullanicilar";
        const string label = "Kullanıcılar";

        var mockUsers = new List<AppUser>
        {
            new() { Email = "ahmet.yilmaz@example.com", DisplayName = "Ahmet Yılmaz", Role = UserRole.Admin, GoogleSubjectId = "google-ahmet-123", CreatedAt = DateTimeOffset.UtcNow },
            new() { Email = "merve.demir@example.com", DisplayName = "Merve Demir", Role = UserRole.User, GoogleSubjectId = "google-merve-456", CreatedAt = DateTimeOffset.UtcNow },
            new() { Email = "can.kaya@example.com", DisplayName = "Can Kaya", Role = UserRole.User, GoogleSubjectId = "google-can-789", CreatedAt = DateTimeOffset.UtcNow },
            new() { Email = "elif.sahin@example.com", DisplayName = "Elif Şahin", Role = UserRole.User, GoogleSubjectId = "google-elif-101", CreatedAt = DateTimeOffset.UtcNow },
            new() { Email = "burak.aksoy@example.com", DisplayName = "Burak Aksoy", Role = UserRole.User, GoogleSubjectId = "google-burak-202", CreatedAt = DateTimeOffset.UtcNow }
        };

        var added = 0;
        foreach (var u in mockUsers)
        {
            if (!await db.Users.AnyAsync(usr => usr.Email == u.Email, ct))
            {
                db.Users.Add(u);
                added++;
            }
        }

        await db.SaveChangesAsync(ct);

        return new SeedStepResult(key, label, true,
            added == 0 ? "Zaten dolu, atlandı." : $"{added} kullanıcı eklendi.",
            await db.Users.CountAsync(ct));
    }

    private async Task<SeedStepResult> SeedBlogPostsAsync(CancellationToken ct)
    {
        const string key = "bloglar";
        const string label = "Blog yazıları";

        var admin = await db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin, ct)
                    ?? await db.Users.OrderBy(u => u.Id).FirstOrDefaultAsync(ct);
        if (admin is null)
            return new SeedStepResult(key, label, false, "Önce “Kullanıcılar” şemasını tohumlayın.", 0);

        var lastUserId = await db.Users.OrderByDescending(u => u.Id).Select(u => u.Id).FirstAsync(ct);

        var mockBlogs = new List<BlogPost>
        {
            new()
            {
                AuthorUserId = admin.Id,
                Title = "2026 Yazının En Etkileyici ve Hafif 5 Parfümü",
                Slug = "2026-yazinin-en-etkileyici-ve-hafif-5-parfumu",
                Body = "Sıcak yaz günlerinde ağır ve baharatlı parfümler yerine, tazeleyici ve ferahlatıcı kokular tercih edilmelidir. Bu yazımızda hem kalıcılığıyla büyüleyen hem de etrafındakileri boğmayan en popüler 5 yaz parfümünü sizler için derledik. Listemizde narenciye, deniz notaları ve hafif çiçeksi dokunuşlar ön planda. Yazın ferahlığını teninizde hissetmek istiyorsanız bu parfümlere mutlaka şans vermelisiniz.",
                Excerpt = "Sıcak havalarda sizi tazeleyecek, hafif ama son derece kalıcı en iyi 5 yaz parfümü önerisi.",
                CoverImageUrl = "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800",
                Status = BlogPostStatus.Published,
                PublishedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new()
            {
                AuthorUserId = admin.Id,
                Title = "Parfüm Notaları Nedir? Üst, Orta ve Alt Notaların Sırrı",
                Slug = "parfum-notalari-nedir-ust-orta-ve-alt-notalarin-sirri",
                Body = "Bir parfümü sıktığınızda aldığınız ilk koku ile birkaç saat sonra teninizde kalan koku neden farklıdır? İşte bu durum tamamen koku piramidi ile ilgilidir. Parfümler; uçuculuk sürelerine göre Üst (Baş), Orta (Kalp) ve Alt (Dip) notalardan oluşur. Üst notalar narenciye gibi hızlı uçan kokularken, alt notalar odunsu, amber ve misk gibi teninizde gün boyu kalacak ağır moleküllerden oluşur. Gelin parfüm notalarının bu gizemli dünyasını birlikte keşfedelim.",
                Excerpt = "Koku piramidinin katmanlarını ve parfümlerin zaman içindeki gelişimini öğrenin.",
                CoverImageUrl = "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=800",
                Status = BlogPostStatus.Published,
                PublishedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new()
            {
                AuthorUserId = admin.Id,
                Title = "Parfüm Kalıcılığını Artırmanın 7 Altın Kuralı",
                Slug = "parfum-kaliciligini-artirmanin-7-altin-kurali",
                Body = "Parfümünüzün gün boyu sizinle kalmasını istiyorsanız, sadece kaliteli bir parfüm seçmek yetmez. Uygulama teknikleri ve cilt bakımı da kalıcılıkta büyük rol oynar. İşte parfüm kalıcılığını iki katına çıkaracak 7 altın kural: 1. Temiz ve nemli cilde uygulayın. 2. Nabız noktalarına sıkın (bilek, boyun, kulak arkası). 3. Parfümü sıktıktan sonra bileklerinizi birbirine sürtmeyin. 4. Doğru saklama koşullarında saklayın, nemli banyolardan uzak tutun. 5. Kıyafetlerinize de hafifçe sıkabilirsiniz. 6. Saç fırçanıza sıkıp saçınızı tarayın. 7. Cilt tipinize uygun konsantrasyonu seçin.",
                Excerpt = "En sevdiğiniz kokunun teninizde çok daha uzun süre kalmasını sağlayacak pratik yöntemler.",
                CoverImageUrl = "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=800",
                Status = BlogPostStatus.Published,
                PublishedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new()
            {
                AuthorUserId = lastUserId,
                Title = "Niche (Niş) Parfüm Nedir? Neden Bu Kadar Pahalılar?",
                Slug = "niche-parfum-nedir-neden-bu-kadar-pahalilar",
                Body = "Tasarımcı parfümleri geniş kitlelere hitap etmek için üretilirken, niş parfümler tamamen sanatsal ve benzersiz koku deneyimleri sunmak amacıyla tasarlanır. Sınırlı sayıda üretilen bu kokularda en nadide, doğal ve pahalı esanslar kullanılır. Niş parfümler, ticari kaygılardan uzak, hikayesi olan tasarımlardır. Creed, Nishane, Roja gibi markaların neden lüksün zirvesinde yer aldığını bu yazımızda inceliyoruz.",
                Excerpt = "Özel tasarım koku dünyasının kapılarını aralayın: Niş parfümlerin farkları ve özellikleri.",
                CoverImageUrl = "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800",
                Status = BlogPostStatus.Published,
                PublishedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            }
        };

        var added = 0;
        foreach (var b in mockBlogs)
        {
            if (!await db.BlogPosts.AnyAsync(bp => bp.Slug == b.Slug, ct))
            {
                db.BlogPosts.Add(b);
                added++;
            }
        }

        await db.SaveChangesAsync(ct);

        return new SeedStepResult(key, label, true,
            added == 0 ? "Zaten dolu, atlandı." : $"{added} yazı eklendi.",
            await db.BlogPosts.CountAsync(ct));
    }

    private async Task<SeedStepResult> SeedPerfumeCommentsAsync(CancellationToken ct)
    {
        const string key = "yorumlar";
        const string label = "Parfüm yorumları";

        var perfumes = await db.Perfumes.ToListAsync(ct);
        if (perfumes.Count == 0)
            return new SeedStepResult(key, label, false, "Önce “Katalog” şemasını tohumlayın.", 0);

        var users = await db.Users.OrderBy(u => u.Id).ToListAsync(ct);
        if (users.Count == 0)
            return new SeedStepResult(key, label, false, "Önce “Kullanıcılar” şemasını tohumlayın.", 0);

        var random = new Random(42); // deterministik mock veri

        var commentsPool = new[]
        {
            "Çok güzel ve kalıcı bir koku, özellikle üst notalardaki bergamot tazeliğini çok hissettiriyor.",
            "Kalıcılığı bende 6 saat civarı sürdü. Kokusu çok asil ama biraz iddialı buldum.",
            "Muhteşem bir parfüm! Nereye gitsem adını soruyorlar. Tam bir imza kokusu.",
            "İlk sıktığımda biraz ağır geldi ama 1 saat sonra oturan dip notalar harika bir odunsu kokuya dönüştü.",
            "Benim cildimde maalesef çok kalıcı olmadı ama kokunun güzelliğine kelimeler yetmez.",
            "Her mevsim kullanılabilecek çok yönlü bir parfüm. Kesinlikle tavsiye ederim.",
            "Biraz fazla yaygınlaştı ama kalitesi tartışılmaz. Tam bir klasik.",
            "Ofiste rahatsız etmeyen, akşam için de yeterince iddialı bir denge kurmuş."
        };

        var added = 0;

        foreach (var p in perfumes)
        {
            if (await db.PerfumeComments.AnyAsync(c => c.PerfumeId == p.Id, ct))
                continue;

            var commentCount = random.Next(3, 7); // her parfüme 3-6 yorum
            var perfumeRatings = new List<short>();
            var processedUsers = new HashSet<int>();

            for (var cIdx = 0; cIdx < commentCount; cIdx++)
            {
                var user = users[cIdx % users.Count];
                if (!processedUsers.Add(user.Id)) continue;

                var score = (short)random.Next(3, 6); // 3, 4 veya 5 yıldız
                perfumeRatings.Add(score);

                if (!await db.Ratings.AnyAsync(r => r.PerfumeId == p.Id && r.UserId == user.Id, ct))
                {
                    db.Ratings.Add(new Rating
                    {
                        UserId = user.Id,
                        PerfumeId = p.Id,
                        Score = score,
                        CreatedAt = DateTimeOffset.UtcNow.AddDays(-random.Next(1, 30)),
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                }

                db.PerfumeComments.Add(new PerfumeComment
                {
                    PerfumeId = p.Id,
                    UserId = user.Id,
                    Body = commentsPool[random.Next(commentsPool.Length)],
                    Status = ModerationStatus.Approved,
                    CreatedAt = DateTimeOffset.UtcNow.AddDays(-random.Next(1, 30))
                });
                added++;
            }

            p.RatingCount = perfumeRatings.Count;
            p.AvgRating = perfumeRatings.Count > 0 ? (decimal)perfumeRatings.Average(r => r) : 0m;
        }

        await db.SaveChangesAsync(ct);

        return new SeedStepResult(key, label, true,
            added == 0 ? "Zaten dolu, atlandı." : $"{added} yorum ve puan eklendi.",
            await db.PerfumeComments.CountAsync(ct));
    }

    private async Task<SeedStepResult> SeedComparisonCommentsAsync(CancellationToken ct)
    {
        const string key = "karsilastirma-yorumlari";
        const string label = "Karşılaştırma yorumları";

        var perfumes = await db.Perfumes.ToListAsync(ct);
        if (perfumes.Count < 2)
            return new SeedStepResult(key, label, false, "Önce “Katalog” şemasını tohumlayın.", 0);

        var users = await db.Users.OrderBy(u => u.Id).ToListAsync(ct);
        if (users.Count == 0)
            return new SeedStepResult(key, label, false, "Önce “Kullanıcılar” şemasını tohumlayın.", 0);

        var random = new Random(43);

        var pool = new[]
        {
            "İkisini de denedim; ilki daha derin, ikincisi günlük kullanım için daha rahat.",
            "Açılışta neredeyse ayırt edemedim, fark dip notalarda ortaya çıkıyor.",
            "Kalıcılık olarak birincisi net üstün, yanımda 8 saat kaldı.",
            "Yayılımı birincide çok daha güçlü, ikincisi daha kişisel bir koku bırakıyor.",
            "Kışın birincisini, yazın ikincisini tercih ediyorum. İkisi de güzel.",
            "Bence bu ikisi aynı kategoride değil; farklı ortamlar için farklı seçimler."
        };

        // Aynı cinsiyetteki ardışık parfüm çiftleri
        var pairs = perfumes
            .GroupBy(p => p.Gender)
            .SelectMany(g => g.OrderBy(p => p.Slug).Chunk(2).Where(c => c.Length == 2))
            .Take(8)
            .ToList();

        var added = 0;

        foreach (var pair in pairs)
        {
            var (first, second) = ComparisonComment.NormalizePair(pair[0].Id, pair[1].Id);

            if (await db.ComparisonComments.AnyAsync(c => c.Perfume1Id == first && c.Perfume2Id == second, ct))
                continue;

            var count = random.Next(2, 5); // her karşılaştırmaya 2-4 yorum
            for (var idx = 0; idx < count; idx++)
            {
                var user = users[(idx + first) % users.Count];
                db.ComparisonComments.Add(new ComparisonComment
                {
                    Perfume1Id = first,
                    Perfume2Id = second,
                    UserId = user.Id,
                    Body = pool[random.Next(pool.Length)],
                    PreferredPerfumeId = random.Next(2) == 0 ? first : second,
                    Status = ModerationStatus.Approved,
                    CreatedAt = DateTimeOffset.UtcNow.AddDays(-random.Next(1, 40))
                });
                added++;
            }
        }

        await db.SaveChangesAsync(ct);

        return new SeedStepResult(key, label, true,
            added == 0 ? "Zaten dolu, atlandı." : $"{pairs.Count} karşılaştırmaya {added} yorum eklendi.",
            await db.ComparisonComments.CountAsync(ct));
    }

    // ------------------------------------------------------------ yardımcı

    /// <summary>Adında konsantrasyon geçmeyen parfümlere deterministik bir konsantrasyon dağıtır.</summary>
    private static Concentration FallbackConcentration(int index)
    {
        Concentration[] common = [Concentration.Edp, Concentration.Edt];
        return common[index % common.Length];
    }

    private static (string Name, string? Concentration, int? SizeMl) ParseName(
        string rawName,
        string brandName,
        List<SeedConcentrationToken> concentrationTokens)
    {
        var name = rawName.Replace("İ", "I").Replace("̇", "");

        int? sizeMl = null;
        var sizeMatch = SizeRegex().Match(name);
        if (sizeMatch.Success)
        {
            sizeMl = int.Parse(sizeMatch.Groups[1].Value);
            name = name.Remove(sizeMatch.Index);
        }

        string? concentrationName = null;
        foreach (var item in concentrationTokens)
        {
            int idx;
            while ((idx = name.IndexOf($" {item.Token}", StringComparison.OrdinalIgnoreCase)) >= 0)
            {
                concentrationName ??= item.Name;
                name = name.Remove(idx, item.Token.Length + 1);
            }
        }

        var compactBrand = brandName.Replace(" ", "", StringComparison.Ordinal);
        var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
        while (words.Count > 1 && compactBrand.Contains(words[0], StringComparison.OrdinalIgnoreCase))
            words.RemoveAt(0);

        words.RemoveAll(w => w.Equals("Unisex", StringComparison.OrdinalIgnoreCase));

        var deduped = new List<string>();
        foreach (var word in words)
            if (deduped.Count == 0 || !deduped[^1].Equals(word, StringComparison.OrdinalIgnoreCase))
                deduped.Add(word);

        return (string.Join(' ', deduped), concentrationName, sizeMl);
    }

    /// <summary>
    /// Parfüm adındaki anahtar kelimeden koku ailesini bulur.
    /// Kurallar sırayla denenir (özel token'lar genel olanlardan önce gelmeli).
    /// Eşleşme yoksa aileler deterministik olarak sırayla dağıtılır.
    /// </summary>
    private static FragranceFamily ResolveFamily(
        string rawName,
        List<SeedFragranceFamilyRule> rules,
        int fallbackIndex)
    {
        foreach (var rule in rules)
        {
            if (rawName.Contains(rule.Token, StringComparison.OrdinalIgnoreCase)
                && Lookups.FamilyFromName(rule.Family) is { } matched)
            {
                return matched;
            }
        }

        var all = Enum.GetValues<FragranceFamily>();
        return all[fallbackIndex % all.Length];
    }

    private static Gender ParseGender(string gender, string rawName) =>
        rawName.Contains("unisex", StringComparison.OrdinalIgnoreCase)
            ? Gender.Unisex
            : gender.ToLowerInvariant() switch
            {
                "men" or "male" => Gender.Male,
                "women" or "female" => Gender.Female,
                _ => Gender.Unisex,
            };

    /// <summary>Parfüm için markaya, aileye ve cinsiyete göre değişen zengin bir Türkçe tanıtım metni üretir.</summary>
    private static string BuildDescription(Perfume p)
    {
        var family = p.FragranceFamily?.Label().ToLowerInvariant() ?? "imzasal";
        var audience = p.Gender switch
        {
            Gender.Male => "erkekler",
            Gender.Female => "kadınlar",
            _ => "kadın ve erkek herkes",
        };
        var conc = p.Concentration?.Label() ?? "parfüm";

        return
            $"{p.Brand.Name} {p.Name}, {audience} için tasarlanmış {family} koku ailesinden özenli bir {conc}. " +
            $"Açılışta ferah ve davetkâr bir giriş sunarken, kalbinde {family} karakterini öne çıkaran dengeli bir yapı kurar; " +
            $"böylece hem gündelik kullanımda hem de özel anlarda rahatça taşınabilir. " +
            $"Dengeli kalıcılığı ve ölçülü yayılımıyla ten üzerinde zamanla evrilir. " +
            $"{p.Name}, sadelikten ödün vermeden karakter arayanlar için modern ve zamansız bir tercih olarak öne çıkar.";
    }

    private sealed record SeedRow(string Brand, string Name, string Price, string Gender, string Url, string ImageUrl);

    // seed-meta.json eşleme modelleri
    private record SeedMeta(
        List<SeedBrand> Brands,
        List<SeedConcentrationToken> ConcentrationTokens,
        List<SeedFragranceFamilyRule> FragranceFamilyRules);

    private record SeedFragranceFamilyRule(string Token, string Family);
    private record SeedBrand(string Name, string? Country, string? Description, string? LogoUrl);
    private record SeedConcentrationToken(string Token, string Name);
}
