using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

/// <summary>"Kullanıyorum" bildiriminden sonra parfümün güncel yaş dağılımı.</summary>
public record PerfumeUsageResultDto(int UsageCount, List<ScoredRefDto> AgeGroups);
