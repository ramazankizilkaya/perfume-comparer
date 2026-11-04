using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PerfumeComparer.Business.Ai;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Data;
using PerfumeComparer.Domain;
using PerfumeComparer.Domain.Entities;

namespace PerfumeComparer.Business.Services;

public class PerfumeAdvisorService(
    IUnitOfWork uow,
    IAiClient ai,
    ILogger<PerfumeAdvisorService> logger) : IPerfumeAdvisorService
{
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> UserLocks = new();

    private sealed class AiAdvisorResult
    {
        public int SelectedPerfumeId { get; set; }
        public string? PerfumerAdvice { get; set; }
    }

    public async Task<PerfumeAdvisorResponse> GetStatusAsync(int userId, CancellationToken ct = default)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-24);
        var existing = await uow.GetRepository<UserPerfumeRecommendation>().AsNoTracking()
            .Include(r => r.Perfume).ThenInclude(p => p.Brand)
            .Include(r => r.Perfume).ThenInclude(p => p.Accords).ThenInclude(pa => pa.Accord)
            .Where(r => r.UserId == userId && r.CreatedAt >= cutoff)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (existing is not null && existing.Perfume is not null)
        {
            return new PerfumeAdvisorResponse(
                Success: true,
                Message: "Bugünkü parfümör öneriniz hazır.",
                HasUsedToday: true,
                Perfume: MapToDto(existing.Perfume),
                PerfumerAdvice: existing.PerfumerAdvice,
                CreatedAt: existing.CreatedAt,
                NextAvailableAt: existing.CreatedAt.AddHours(24)
            );
        }

        return new PerfumeAdvisorResponse(
            Success: true,
            Message: null,
            HasUsedToday: false,
            Perfume: null,
            PerfumerAdvice: null,
            CreatedAt: null,
            NextAvailableAt: null
        );
    }

    public async Task<PerfumeAdvisorResponse> RecommendAsync(int userId, PerfumeAdvisorRequest request, CancellationToken ct = default)
    {
        var userLock = UserLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await userLock.WaitAsync(ct);
        try
        {
            // 1. Günlük kota kontrolü (son 24 saat içinde öneri almış mı?)
            var status = await GetStatusAsync(userId, ct);
            if (status.HasUsedToday && status.Perfume is not null)
            {
                return status with
                {
                    Message = "Günde yalnızca 1 kez tavsiye alabilirsiniz. Bugünkü öneriniz aşağıda yer almaktadır."
                };
            }

            // 2. Aday parfümleri veritabanından çek
            var candidates = await FetchCandidatesAsync(request, ct);
            if (candidates.Count == 0)
            {
                // Emniyet sübabı: filtreler çok darsa genel en beğenilen parfümleri getir
                candidates = await FetchFallbackCandidatesAsync(request, ct);
            }

            if (candidates.Count == 0)
            {
                return new PerfumeAdvisorResponse(
                    Success: false,
                    Message: "Kriterlerinize uygun bir parfüm bulunamadı. Lütfen farklı tercihler deneyin.",
                    HasUsedToday: false,
                    Perfume: null,
                    PerfumerAdvice: null,
                    CreatedAt: null,
                    NextAvailableAt: null
                );
            }

            // 3. Yapay zekâ (Parfümör persona) ile adayı seç ve tavsiye mektubunu yazdır
            var (selectedCandidate, adviceText) = await ConsultPerfumerAsync(request, candidates, ct);

            // 4. Veritabanına kaydet
            var now = DateTimeOffset.UtcNow;
            var promptJson = JsonSerializer.Serialize(request);
            var recommendation = new UserPerfumeRecommendation
            {
                UserId = userId,
                PerfumeId = selectedCandidate.Id,
                PromptJson = promptJson,
                PerfumerAdvice = adviceText,
                CreatedAt = now
            };

            uow.GetRepository<UserPerfumeRecommendation>().Add(recommendation);
            await uow.SaveChangesAsync();

            return new PerfumeAdvisorResponse(
                Success: true,
                Message: "Parfümörünüzün size özel seçimi hazır!",
                HasUsedToday: true,
                Perfume: MapToDto(selectedCandidate),
                PerfumerAdvice: adviceText,
                CreatedAt: now,
                NextAvailableAt: now.AddHours(24)
            );
        }
        finally
        {
            userLock.Release();
        }
    }

    private async Task<List<Perfume>> FetchCandidatesAsync(PerfumeAdvisorRequest request, CancellationToken ct)
    {
        var targetGender = ParseGender(request.Gender);
        var tokens = ExtractSearchTokens(request);
        var dislikedTokens = ExtractDislikedTokens(request.DislikedNotes);

        var query = uow.GetRepository<Perfume>().AsNoTracking()
            .Include(p => p.Brand)
            .Include(p => p.Accords).ThenInclude(pa => pa.Accord)
            .Include(p => p.Notes).ThenInclude(pn => pn.Note)
            .Where(p => p.IsPublished);

        if (targetGender.HasValue)
        {
            if (targetGender.Value == Gender.Male)
                query = query.Where(p => p.Gender == Gender.Male || p.Gender == Gender.Unisex);
            else if (targetGender.Value == Gender.Female)
                query = query.Where(p => p.Gender == Gender.Female || p.Gender == Gender.Unisex);
            else if (targetGender.Value == Gender.Unisex)
                query = query.Where(p => p.Gender == Gender.Unisex);
        }

        // Popüler ve kaliteli kokuları önceliklendir
        query = query.Where(p => p.RatingCount >= 10 && p.AvgRating >= 3.5m);

        var list = await query
            .OrderByDescending(p => p.RatingCount)
            .Take(80)
            .ToListAsync(ct);

        if (tokens.Count == 0 && dislikedTokens.Count == 0)
        {
            return list.Take(10).ToList();
        }

        // Notalar, akorlar ve isim eşleşmesine göre skorla; sevilmeyen notaları cezalandır
        var scored = list.Select(p =>
        {
            int score = 0;
            var notesAndAccords = (string.Join(" ", p.Accords.Select(a => a.Accord.Name)) + " " +
                                   string.Join(" ", p.Notes.Select(n => n.Note.Name))).ToLowerInvariant();
            var searchable = (p.Name + " " + p.Brand.Name + " " + (p.Description ?? "") + " " + notesAndAccords).ToLowerInvariant();

            foreach (var tok in tokens)
            {
                if (searchable.Contains(tok)) score += 3;
            }

            bool hasDisliked = false;
            foreach (var dtok in dislikedTokens)
            {
                if (notesAndAccords.Contains(dtok))
                {
                    score -= 15;
                    hasDisliked = true;
                }
            }

            return new { Perfume = p, Score = score, HasDisliked = hasDisliked };
        }).ToList();

        var filtered = scored.Where(x => !x.HasDisliked).ToList();
        var pool = filtered.Count > 0 ? filtered : scored;

        return pool
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Perfume.RatingCount)
            .Select(x => x.Perfume)
            .Take(10)
            .ToList();
    }

    private async Task<List<Perfume>> FetchFallbackCandidatesAsync(PerfumeAdvisorRequest request, CancellationToken ct)
    {
        var targetGender = ParseGender(request.Gender);
        var query = uow.GetRepository<Perfume>().AsNoTracking()
            .Include(p => p.Brand)
            .Include(p => p.Accords).ThenInclude(pa => pa.Accord)
            .Include(p => p.Notes).ThenInclude(pn => pn.Note)
            .Where(p => p.IsPublished);

        if (targetGender.HasValue)
        {
            query = query.Where(p => p.Gender == targetGender.Value || p.Gender == Gender.Unisex);
        }

        return await query
            .OrderByDescending(p => p.RatingCount)
            .Take(10)
            .ToListAsync(ct);
    }

    private async Task<(Perfume Selected, string Advice)> ConsultPerfumerAsync(
        PerfumeAdvisorRequest request,
        List<Perfume> candidates,
        CancellationToken ct)
    {
        if (candidates.Count == 1)
        {
            return (candidates[0], GenerateFallbackAdvice(request, candidates[0]));
        }

        if (!ai.Enabled)
        {
            var fallback = candidates[0];
            return (fallback, GenerateFallbackAdvice(request, fallback));
        }

        var candidateInfos = candidates.Select(c => new
        {
            id = c.Id,
            name = c.Name,
            brand = c.Brand?.Name ?? "",
            accords = c.Accords.OrderBy(a => a.Rank).Take(4).Select(a => a.Accord.Name).ToList(),
            topNotes = c.Notes.Take(5).Select(n => n.Note.Name).ToList(),
            rating = c.AvgRating
        }).ToList();

        var prompt = $$"""
            Sen uzman bir koku danışmanısın. Kullanıcının tercihlerini bir parfümör uzmanlığıyla analiz ederek adaylar arasından en doğru seçimi yap ve kararının gerekçesini analitik, net ve açıklayıcı bir dille yaz.

            KULLANICI TERCİHLERİ:
            - Cinsiyet Tercihi: {{request.Gender ?? "Belirtilmedi"}}
            - Beğendiği Parfümler / Referanslar: {{request.LikedPerfumes ?? "Belirtilmedi"}}
            - Sevmediği / Kaçındığı Notalar ve Kokular: {{request.DislikedNotes ?? "Yok"}}
            - Sevdiği Koku Tipleri / Notalar: {{request.PreferredNotes ?? "Belirtilmedi"}}
            - Kullanım Amacı / Ortamı: {{request.Occasion ?? "Belirtilmedi"}}
            - Mevsim Tercihi: {{request.Season ?? "Dört Mevsim"}}
            - Kullanıcının Kendi Notu: "{{request.FreeText ?? "Yok"}}"

            ADAY PARFÜMLER (Sadece bunlardan birini seçebilirsin):
            {{JsonSerializer.Serialize(candidateInfos)}}

            KURALLAR VE TAVSİYE METNİ ÜSLUBU:
            1. "Hoş geldiniz", "Lüks butiğimize hoş geldiniz", "Sizi ağırlamaktan onur duyarım", "Vitrini titizlikle inceledim", "Ruhunuza dokunacak başyapıt" gibi tiyatral, ağdalı veya mağaza karşılama klişelerinden KESİNLİKLE KAÇIN.
            2. Tavsiye metni bir analizin ve uzman tavsiyesinin gerekçesi niteliğinde olmalıdır:
               - Kullanıcının beğendiği parfümlerden yola çıkarak koku tarzına dair çıkarım (örneğin: "Verdiğiniz bilgilerden koku tarzınızın ... olduğu görülüyor.").
               - Sevmediği kokular/notalar dikkate alınarak hangi koku ailelerinden veya boğucu yapılardan neden uzak durulduğu açıklaması.
               - Kullanım ortamı (örneğin ofis/günlük) ve mevsimine göre seçilen parfümün notalarının bu isteğe nasıl tam karşılık verdiği.
            3. Seçilen parfümün ID'sini ("selectedPerfumeId") ve bu mantıksal açıklamayı ("perfumerAdvice") JSON formatında dön.

            SADECE ŞU GEÇERLİ JSON'I DÖNDÜR:
            {
              "selectedPerfumeId": 0,
              "perfumerAdvice": "..."
            }
            """;

        try
        {
            var result = await ai.GenerateJsonAsync<AiAdvisorResult>(prompt, ct);
            if (result is not null && result.SelectedPerfumeId > 0 && !string.IsNullOrWhiteSpace(result.PerfumerAdvice))
            {
                var matched = candidates.FirstOrDefault(c => c.Id == result.SelectedPerfumeId);
                if (matched is not null)
                {
                    return (matched, result.PerfumerAdvice.Trim());
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Parfümör AI tavsiyesi üretilemedi, yedek tavsiyeye geçiliyor.");
        }

        var selected = candidates[0];
        return (selected, GenerateFallbackAdvice(request, selected));
    }

    private static string GenerateFallbackAdvice(PerfumeAdvisorRequest request, Perfume perfume)
    {
        var accords = string.Join(", ", perfume.Accords.OrderBy(a => a.Rank).Take(3).Select(a => a.Accord.Name));
        return $"Verdiğiniz tercihler incelendiğinde koku tarzınızın dengeli ve karakterli profillere yöneldiği görülüyor. " +
               (!string.IsNullOrWhiteSpace(request.DislikedNotes) ? $"Belirttiğiniz gibi {request.DislikedNotes} tarzı yorucu notalardan kaçınılarak, " : "") +
               (!string.IsNullOrWhiteSpace(request.Occasion) ? $"{request.Occasion} ortamı için " : "") +
               $"en uygun aday olarak {perfume.Brand?.Name} imzalı {perfume.Name} öne çıkıyor. " +
               (!string.IsNullOrWhiteSpace(accords) ? $"Özellikle öne çıkan {accords} akorları, gün boyu aradığınız uyumu ve performansı sağlayacaktır." : "");
    }

    private static Gender? ParseGender(string? g)
    {
        if (string.IsNullOrWhiteSpace(g)) return null;
        var lower = g.Trim().ToLowerInvariant();
        if (lower is "male" or "erkek") return Gender.Male;
        if (lower is "female" or "kadin" or "kadın") return Gender.Female;
        if (lower is "unisex") return Gender.Unisex;
        return null;
    }

    private static List<string> ExtractSearchTokens(PerfumeAdvisorRequest req)
    {
        var raw = string.Join(" ",
            req.LikedPerfumes ?? "",
            req.PreferredNotes ?? "",
            req.FreeText ?? "",
            req.Occasion ?? "",
            req.Season ?? ""
        );

        return raw.ToLowerInvariant()
            .Split(new[] { ' ', ',', '.', ';', '-', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 3)
            .Distinct()
            .Take(15)
            .ToList();
    }

    private static List<string> ExtractDislikedTokens(string? dislikedNotes)
    {
        if (string.IsNullOrWhiteSpace(dislikedNotes)) return [];
        return dislikedNotes.ToLowerInvariant()
            .Split(new[] { ' ', ',', '.', ';', '-', '/', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 3)
            .Distinct()
            .Take(15)
            .ToList();
    }

    private static RecommendedPerfumeDto MapToDto(Perfume p)
    {
        var topAccord = p.Accords.OrderBy(a => a.Rank).FirstOrDefault()?.Accord?.Name;
        var concentrationSlug = p.Concentration?.Slug();
        var concentrationLabel = p.Concentration?.Label();
        var familySlug = p.FragranceFamily?.Slug();
        var familyLabel = p.FragranceFamily?.Label();
        var path = PerfumeUrl.Path(p.Gender, concentrationSlug, p.Brand?.Slug ?? "", p.Slug);

        return new RecommendedPerfumeDto(
            Id: p.Id,
            Name: p.Name,
            Slug: p.Slug,
            BrandName: p.Brand?.Name ?? "",
            BrandSlug: p.Brand?.Slug ?? "",
            Gender: PerfumeUrl.GenderLabel(p.Gender),
            Concentration: concentrationLabel,
            ConcentrationSlug: concentrationSlug,
            FragranceFamily: familyLabel,
            FragranceFamilySlug: familySlug,
            ImageUrl: p.ImageUrl,
            Path: path,
            AvgRating: p.AvgRating,
            RatingCount: p.RatingCount,
            TopAccord: topAccord
        );
    }
}
