using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record AutocompleteDto(
    List<AutocompletePerfumeDto> Perfumes,
    List<AutocompleteItemDto> Brands,
    List<AutocompleteItemDto> Notes,
    List<AutocompleteItemDto> Accords,
    List<AutocompleteItemDto> Blogs);

public record AiSearchResultDto(
    string Query,
    string? AiSummary,
    string? FilterExplanation,
    List<PerfumeCardDto> Items,
    int TotalCount,
    /// <summary>Yapay zekâ gerçekten çalıştı mı? False ise sonuçlar klasik aramadan gelir.</summary>
    bool AiUsed = false);

