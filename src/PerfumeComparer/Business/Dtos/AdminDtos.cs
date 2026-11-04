using System;
using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

// Yönetim paneli (/tr/admin) yanıtları. Hepsi mevcut tablolardan hesaplanır; ayrı bir
// analitik tablosu yoktur.

/// <summary>Bir sayaç: tüm zamanlar ve seçilen dönem.</summary>
public record AdminCountDto(int Total, int Period);

/// <summary>
/// Ziyaretçi sayıları. Kaynak <c>perfume_views</c>: parfüm sayfası açan her IP, parfüm
/// başına bir satırdır ve satırın zamanı günde en fazla bir kez tazelenir. Bu yüzden
/// sayılar "parfüm sayfası açan tekil ziyaretçi"dir; anasayfa veya blog ziyareti sayılmaz.
/// </summary>
public record AdminVisitorsDto(int Last24h, int Last7d, int Last30d, int AllTime, int PerfumePageViews);

public record AdminSummaryDto(
    AdminVisitorsDto Visitors,
    AdminCountDto Users,
    AdminCountDto PerfumeComments,
    AdminCountDto ComparisonComments,
    AdminCountDto Recommendations,
    int RecommendationUsers,
    AdminCountDto Ratings,
    AdminCountDto Favorites,
    AdminCountDto ComparisonVotes,
    AdminCountDto Usages,
    AdminCountDto Photos,
    int BlogViews,
    int AiSummaries,
    IReadOnlyDictionary<string, int> BlogsByStatus);

/// <summary>Bir günün etkileşim sayıları (Türkiye saatiyle gün).</summary>
public record AdminDailyDto(
    string Date,
    int NewUsers,
    int Comments,
    int Recommendations,
    int Ratings,
    int Votes,
    int Favorites);

/// <summary>Sıralı listelerdeki tek satır. <c>Path</c> parfüm için kanonik yol, blog için slug.</summary>
public record AdminRankDto(string Title, string? Subtitle, string? Path, int Value);

/// <summary>Danışman formunda bir seçeneğin kaç kez seçildiği.</summary>
public record AdminChoiceDto(string Label, int Count);

public record AdminAdvisorInsightsDto(
    IReadOnlyList<AdminChoiceDto> Gender,
    IReadOnlyList<AdminChoiceDto> Occasion,
    IReadOnlyList<AdminChoiceDto> Season);

public record AdminAnalyticsDto(
    int Days,
    DateTimeOffset GeneratedAt,
    AdminSummaryDto Summary,
    IReadOnlyList<AdminDailyDto> Daily,
    IReadOnlyList<AdminRankDto> TopPerfumes,
    IReadOnlyList<AdminRankDto> TopPerfumesAllTime,
    IReadOnlyList<AdminRankDto> TopBlogs,
    IReadOnlyList<AdminRankDto> MostCommented,
    IReadOnlyList<AdminRankDto> MostRecommended,
    IReadOnlyList<AdminRankDto> MostFavorited,
    IReadOnlyList<AdminRankDto> TopComparisons,
    AdminAdvisorInsightsDto Advisor);

/// <summary>Panelde incelenen blog yazısı (gövde dahil).</summary>
public record AdminBlogDto(
    int Id,
    string Title,
    string Slug,
    string? Excerpt,
    string Body,
    string? CoverImageUrl,
    string? Category,
    string Status,
    int ViewCount,
    string AuthorName,
    string AuthorEmail,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? PublishedAt);

/// <summary>Panelde listelenen kullanıcı yorumu. <c>Kind</c>: "perfume" ya da "comparison".</summary>
public record AdminCommentDto(
    int Id,
    string Kind,
    string Body,
    string Status,
    string AuthorName,
    string? AuthorEmail,
    string Subject,
    string? SubjectPath,
    DateTimeOffset CreatedAt);

/// <summary>"Bana parfüm öner" kullanımı: kim, ne istedi, hangi parfüm önerildi.</summary>
public record AdminRecommendationDto(
    int Id,
    string UserName,
    string UserEmail,
    string PerfumeName,
    string BrandName,
    string PerfumePath,
    string PromptJson,
    string Advice,
    DateTimeOffset CreatedAt);
