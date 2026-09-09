using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.RateLimiting;
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
    builder.Services.AddScoped<ISeedService, SeedService>();
    builder.Services.AddSingleton<ITokenService, TokenService>();
    builder.Services.AddSingleton<IGeminiClient, GeminiClient>();
    builder.Services.AddScoped<IAiSearchPlanner, AiSearchPlanner>();
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

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("DevCors", policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });

    // Rate Limiting
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsync("{\"message\":\"Çok fazla istek gönderildi. Lütfen bir süre bekleyin.\"}", token);
        };

        options.AddFixedWindowLimiter("StrictRateLimit", opt =>
        {
            opt.PermitLimit = 5;
            opt.Window = TimeSpan.FromSeconds(10);
            opt.QueueLimit = 0;
        });

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
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

    app.UseSerilogRequestLogging();
    app.UseExceptionHandler();
    
    app.UseCors("DevCors");
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

    // wwwroot: blog arka planı gibi uygulamayla birlikte gelen statik görseller
    // (/blog_backgrounds/... olarak servis edilir).
    app.UseStaticFiles();

    // Scrape edilen marka ve parfüm görselleri: repo içindeki scrape_files klasörü
    // /media altından servis edilir (DB'de "/media/perfumes/<marka>/<dosya>.webp" durur).
    // Kopyalama yok, tek kaynak scrape_files.
    var mediaRoot = Path.GetFullPath(Path.Combine(
        builder.Environment.ContentRootPath,
        builder.Configuration["Media:Root"] ?? "../../scrape_files"));

    if (Directory.Exists(mediaRoot))
    {
        var contentTypes = new FileExtensionContentTypeProvider();
        contentTypes.Mappings[".webp"] = "image/webp";

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(mediaRoot),
            RequestPath = "/media",
            ContentTypeProvider = contentTypes,
            ServeUnknownFileTypes = false,
        });
    }
    else
    {
        Log.Warning("Görsel klasörü bulunamadı, /media kapalı: {MediaRoot}", mediaRoot);
    }

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();

        // Sadece şema kurulur; veri tohumlama otomatik DEĞİL — /admin sayfasından tetiklenir.
        using var scope = app.Services.CreateScope();
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
}
finally
{
    Log.CloseAndFlush();
}
