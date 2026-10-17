using Microsoft.AspNetCore.Mvc;
using PerfumeComparer.Business.Dtos;
using PerfumeComparer.Business.Services;

namespace PerfumeComparer.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController(ISearchService search, IAiRequestGate aiGate) : ControllerBase
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

    /// <summary>
    /// Doğal dil araması. Model çağrısı giriş yapmış kullanıcıya serbest, anonim ziyaretçiye
    /// IP başına sınırlı (IAiRequestGate); sınır aşılırsa yerel çözümleyiciyle cevaplanır.
    /// </summary>
    [HttpGet("ai")]
    public async Task<IActionResult> AiSearch([FromQuery] string? q, CancellationToken ct)
    {
        var result = await search.AiSearchAsync(q ?? "", () => aiGate.TryEnter(HttpContext), ct);
        return Ok(result);
    }
}
