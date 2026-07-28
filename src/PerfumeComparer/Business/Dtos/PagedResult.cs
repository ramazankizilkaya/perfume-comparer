using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
