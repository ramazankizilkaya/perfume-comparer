using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Business.Services;

namespace PerfumeComparer.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController(ISearchService search) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] SearchQuery query, CancellationToken ct = default)
    {
        var result = await search.SearchAsync(query.Q, query.Page, query.PageSize, ct);
        return Ok(result);
    }

    [HttpGet("autocomplete")]
    public async Task<IActionResult> Autocomplete([FromQuery] string? q, CancellationToken ct)
    {
        var result = await search.AutocompleteAsync(q ?? "", ct);
        return Ok(result);
    }
}
