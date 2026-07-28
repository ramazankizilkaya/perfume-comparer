using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record FilterMetaDto(
    List<RefItemDto> Brands,
    List<RefItemDto> Concentrations,
    List<RefItemDto> FragranceFamilies,
    List<NoteDto> Notes,
    List<RefItemDto> Seasons,
    List<RefItemDto> AgeGroups,
    List<string> Genders);
