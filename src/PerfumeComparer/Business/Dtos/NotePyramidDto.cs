using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record NotePyramidDto(List<NoteDto> Top, List<NoteDto> Middle, List<NoteDto> Base);
