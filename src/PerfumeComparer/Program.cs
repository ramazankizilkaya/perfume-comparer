using System.Text.Json.Serialization;
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

    // AI özetleri: arka plan işi belirli aralıklarla yorumları özetleyip
    // sonucu yorum tablosuna (is_ai_summary) yazar.
    builder.Services.AddSingleton<IAiSummaryClient, AnthropicSummaryClient>();
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

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseExceptionHandler();
    
    app.UseCors("DevCors");

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
