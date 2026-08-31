using System.Text.Json.Serialization;

namespace PerfumeComparer.Business.Dtos;

/// <summary>Kullanıcının yüklediği fotoğraf için yapay zekânın verdiği karar.</summary>
public class PhotoVerdict
{
    [JsonPropertyName("isValid")] public bool IsValid { get; set; } = true;
    [JsonPropertyName("reason")] public string? Reason { get; set; }
}
