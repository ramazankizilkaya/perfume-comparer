using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.EntityFrameworkCore;
using PerfumeComparer.Business.Services;
using PerfumeComparer.Data;
using PerfumeComparer.Data.Persistence;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Backend sırları (API anahtarları, bağlantı dizesi, JWT secret) git'e girmesin
    // diye .gitignore'lu appsettings.Local.json'dan okunur; şablonu
    // appsettings.Local.example.json. Ortam değişkenleri en sonda eklenir ki
    // deploy'da dosya olmadan da her ayar ezilebilsin.
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
    builder.Configuration.AddEnvironmentVariables();

    // Canlıda eksik/zayıf sırla açılmak yerine ilk saniyede durmak daha güvenli.
    if (!builder.Environment.IsDevelopment())
        ValidateProductionConfig(builder.Configuration);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // Controllers
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

    builder.Services.AddOpenApi();

    // DbContext
    var connectionString = builder.Configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException("ConnectionStrings:Default tanımlı değil.");

    builder.Services.AddDbContext<AppDbContext>(options => options
        .UseNpgsql(connectionString)
        .UseSnakeCaseNamingConvention());

    // Repositories & Unit of Work
    builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

    // Services
    builder.Services.AddScoped<ICatalogService, CatalogService>();
    builder.Services.AddScoped<ISearchService, SearchService>();
    builder.Services.AddScoped<IUsageService, UsageService>();
    builder.Services.AddScoped<ISitemapService, SitemapService>();
    builder.Services.AddScoped<ISeedService, SeedService>();
    builder.Services.AddSingleton<ITokenService, TokenService>();
    builder.Services.AddSingleton<IGeminiClient, GeminiClient>();
    builder.Services.AddSingleton<IAiRequestGate, AiRequestGate>();
    builder.Services.AddSingleton<MediaPaths>();
    builder.Services.AddScoped<IAiSearchPlanner, AiSearchPlanner>();
    builder.Services.AddScoped<ICompareAiService, CompareAiService>();
    builder.Services.AddMemoryCache();

    // AI özetleri: arka plan işi belirli aralıklarla yorumları özetleyip
    // sonucu yorum tablosuna (is_ai_summary) yazar. Anthropic anahtarı varsa o
    // kullanılır; yoksa ücretsiz Gemini istemcisine düşülür.
    builder.Services.AddSingleton<AnthropicSummaryClient>();
    builder.Services.AddSingleton<GeminiSummaryClient>();
    builder.Services.AddSingleton<IAiSummaryClient>(sp =>
    {
        var anthropic = sp.GetRequiredService<AnthropicSummaryClient>();
        return anthropic.IsEnabled ? anthropic : sp.GetRequiredService<GeminiSummaryClient>();
    });
    builder.Services.AddSingleton<AiSummaryJob>();
    builder.Services.AddHostedService(sp => sp.GetRequiredService<AiSummaryJob>());

    builder.Services.AddProblemDetails();
    builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>();

    // Ters proxy (nginx, Next sunucusu) arkasında gerçek ziyaretçi IP'si ve şeması
    // X-Forwarded-For / X-Forwarded-Proto başlıklarından okunur. Başlıklara yalnızca
    // loopback ve ForwardedHeaders:KnownProxies listesindeki adreslerden gelince güvenilir.
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        foreach (var proxy in builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
        {
            if (IPAddress.TryParse(proxy, out var ip))
                options.KnownProxies.Add(ip);
            else
                Log.Warning("ForwardedHeaders:KnownProxies geçersiz IP atlandı: {Proxy}", proxy);
        }
    });

    // CORS: geliştirmede her kaynak serbest; canlıda yalnızca Cors:AllowedOrigins listesi.
    // Tarayıcı API'ye doğrudan gittiği için site alan adı bu listede olmalıdır.
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("DevCors", policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
        options.AddPolicy("ProdCors", policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader());
    });

    // Rate Limiting
    var internalKey = builder.Configuration["Api:InternalKey"];
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsync("{\"message\":\"Çok fazla istek gönderildi. Lütfen bir süre bekleyin.\"}", token);
        };

        // Sıkı kural: IP başına 10 saniyede 5 istek (uçlara [EnableRateLimiting] ile bağlanır).
        options.AddPolicy("StrictRateLimit", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromSeconds(10),
                QueueLimit = 0,
            }));

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var path = httpContext.Request.Path;
            if (path.StartsWithSegments("/media") ||
                path.StartsWithSegments("/blog_backgrounds") ||
                path.StartsWithSegments("/health") ||
                path.StartsWithSegments("/openapi"))
            {
                return RateLimitPartition.GetNoLimiter("unlimited_assets");
            }

            // Next.js sunucusundan gelen (sunucu tarafı render) istekler tek IP'den
            // çıkar; gizli X-Internal-Key başlığı taşıyorlarsa IP sınırından muaftır.
            if (IsInternalRequest(httpContext, internalKey))
                return RateLimitPartition.GetNoLimiter("internal_server");

            return RateLimitPartition.GetFixedWindowLimiter(ClientIp(httpContext), _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
        });
    });

    // AntiForgery
    builder.Services.AddAntiforgery(options =>
    {
        options.HeaderName = "X-XSRF-TOKEN";
        options.Cookie.Name = "XSRF-TOKEN";
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.HttpOnly = false;
    });

    var app = builder.Build();

    // IP/şema düzeltmesi, IP'yi okuyan her şeyden (rate limit, görüntülenme sayacı) önce gelmeli.
    app.UseForwardedHeaders();

    app.UseSerilogRequestLogging();
    app.UseExceptionHandler();

    // Tarayıcı, içerik türünü dosya içeriğinden tahmin etmesin (yüklenen dosyalar dahil).
    app.Use(async (context, next) =>
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.XContentTypeOptions = "nosniff";
            return Task.CompletedTask;
        });
        await next();
    });

    app.UseCors(app.Environment.IsDevelopment() ? "DevCors" : "ProdCors");
    app.UseRateLimiter();
    app.UseAntiforgery();

    // Güvenlik ara yazılımı: Tarayıcı harici doğrudan çağrıları filtrelemek için X-Requested-With denetimi
    app.Use(async (context, next) =>
    {
        var path = context.Request.Path;
        if (path.StartsWithSegments("/api/security/client-header-check") || 
            (path.StartsWithSegments("/api") && !path.StartsWithSegments("/media") && (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) || HttpMethods.IsDelete(context.Request.Method))))
        {
            if (!path.StartsWithSegments("/api/security/antiforgery-token") && !path.StartsWithSegments("/api/security/rate-limit-check"))
            {
                if (!context.Request.Headers.TryGetValue("X-Requested-With", out var headerVal) || headerVal != "XMLHttpRequest")
                {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync("{\"message\":\"Geçersiz veya eksik istemci başlığı (X-Requested-With zorunludur).\"}");
                    return;
                }
            }
        }
        await next();
    });

    // Statik görseller değişmez (dosya adı değişince URL de değişir); tarayıcı ve CDN
    // bir yıl önbellekte tutabilir.
    static void CacheForever(StaticFileResponseContext ctx) =>
        ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";

    // Yalnızca görsel uzantıları servis edilir: scrape_files içindeki JSON/TXT gibi ham
    // veri dosyaları /media üzerinden okunamaz (404).
    var imageTypes = new FileExtensionContentTypeProvider(new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        [".webp"] = "image/webp",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".gif"] = "image/gif",
    });

    // wwwroot: blog arka planı gibi uygulamayla birlikte gelen statik görseller
    // (/blog_backgrounds/... olarak servis edilir).
    app.UseStaticFiles(new StaticFileOptions
    {
        ContentTypeProvider = imageTypes,
        ServeUnknownFileTypes = false,
        OnPrepareResponse = CacheForever,
    });

    var media = app.Services.GetRequiredService<MediaPaths>();

    // Kullanıcı fotoğrafları: scrape_files dışında, kalıcı bir klasörden /media/user-photos/...
    Directory.CreateDirectory(media.UserPhotosRoot);
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(media.UserPhotosRoot),
        RequestPath = MediaPaths.UserPhotosRequestPath,
        ContentTypeProvider = imageTypes,
        ServeUnknownFileTypes = false,
        OnPrepareResponse = CacheForever,
    });

    // Scrape edilen marka ve parfüm görselleri: repo içindeki scrape_files klasörü
    // /media altından servis edilir (DB'de "/media/perfumes/<marka>/<dosya>.webp" durur).
    // Kopyalama yok, tek kaynak scrape_files.
    if (Directory.Exists(media.ScrapeRoot))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(media.ScrapeRoot),
            RequestPath = "/media",
            ContentTypeProvider = imageTypes,
            ServeUnknownFileTypes = false,
            OnPrepareResponse = CacheForever,
        });
    }
    else
    {
        Log.Warning("Görsel klasörü bulunamadı, /media kapalı: {MediaRoot}", media.ScrapeRoot);
    }

    if (app.Environment.IsDevelopment())
        app.MapOpenApi();

    // Her ortamda: şema yoksa kurulur, sonradan eklenen tablo/kolon/index'ler tamamlanır
    // (idempotent). Veri tohumlama otomatik DEĞİL — /admin sayfasından tetiklenir.
    using (var scope = app.Services.CreateScope())
    {
        var seeder = scope.ServiceProvider.GetRequiredService<ISeedService>();
        await seeder.EnsureSchemaAsync();
    }

    app.MapHealthChecks("/health");

    // Güvenlik denetim uçları
    app.MapGet("/api/security/client-header-check", () => Results.Ok(new { message = "İstemci başlığı doğrulandı." }));
    app.MapGet("/api/security/rate-limit-check", () => Results.Ok(new { message = "Rate limit kontrolü başarılı." })).RequireRateLimiting("StrictRateLimit");
    app.MapGet("/api/security/antiforgery-token", (IAntiforgery antiforgery, HttpContext context) =>
    {
        var tokens = antiforgery.GetAndStoreTokens(context);
        return Results.Ok(new { token = tokens.RequestToken });
    });
    app.MapPost("/api/security/antiforgery-check", async (IAntiforgery antiforgery, HttpContext context) =>
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);
            return Results.Ok(new { message = "Antiforgery doğrulaması başarılı." });
        }
        catch (AntiforgeryValidationException)
        {
            return Results.BadRequest(new { message = "Geçersiz veya eksik AntiForgery jetonu." });
        }
    });

    app.MapControllers();

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException) // EF design-time aracı host'u kasıtlı iptal eder
{
    Log.Fatal(ex, "Uygulama başlatılamadı");
    Environment.ExitCode = 1;
}
finally
{
    Log.CloseAndFlush();
}

static string ClientIp(HttpContext httpContext) =>
    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

/// <summary>Next.js sunucusunun gizli anahtarı (Api:InternalKey) ile mi geldi? Anahtar tanımsızsa kimse muaf değildir.</summary>
static bool IsInternalRequest(HttpContext httpContext, string? internalKey)
{
    if (string.IsNullOrWhiteSpace(internalKey)) return false;
    if (!httpContext.Request.Headers.TryGetValue("X-Internal-Key", out var header)) return false;

    var given = Encoding.UTF8.GetBytes(header.ToString());
    var expected = Encoding.UTF8.GetBytes(internalKey);
    return given.Length == expected.Length && CryptographicOperations.FixedTimeEquals(given, expected);
}

/// <summary>
/// Development dışındaki ortamlarda açılış öncesi zorunlu ayarlar. Eksikse uygulama
/// hiç açılmaz; böylece herkesin bildiği JWT anahtarıyla ya da Google audience
/// kontrolü olmadan canlıya çıkılamaz.
/// </summary>
static void ValidateProductionConfig(IConfiguration config)
{
    const string defaultSecret = "dev-insecure-secret-please-change-in-production-0123456789";
    var errors = new List<string>();

    var secret = config["Auth:Secret"];
    if (string.IsNullOrWhiteSpace(secret))
        errors.Add("Auth:Secret tanımlı değil (Auth__Secret ortam değişkeni; üretmek için: openssl rand -base64 48).");
    else if (secret == defaultSecret)
        errors.Add("Auth:Secret örnek dosyadaki varsayılan değerle aynı; değiştirin.");
    else if (Encoding.UTF8.GetByteCount(secret) < 32)
        errors.Add("Auth:Secret en az 32 bayt olmalı.");

    if (string.IsNullOrWhiteSpace(config["Google:ClientId"]))
        errors.Add("Google:ClientId tanımlı değil (Google__ClientId; NEXT_PUBLIC_GOOGLE_CLIENT_ID ile aynı değer).");

    if (errors.Count > 0)
        throw new InvalidOperationException("Üretim yapılandırması eksik:\n - " + string.Join("\n - ", errors));
}
