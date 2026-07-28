using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record AutocompleteDto(
    List<AutocompletePerfumeDto> Perfumes,
    List<AutocompleteItemDto> Brands,
    List<AutocompleteItemDto> Notes);
