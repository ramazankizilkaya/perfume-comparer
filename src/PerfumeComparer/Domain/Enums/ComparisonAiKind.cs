namespace PerfumeComparer.Domain;

/// <summary>
/// Bir karşılaştırma çifti için iki ayrı AI metni tutulur ve birbirinin üzerine yazmaz:
/// karşılaştırma sayfasındaki "AI analizi" (parfüm verisinden üretilir) ile
/// arka plan işinin kullanıcı yorumlarından çıkardığı özet.
/// </summary>
public enum ComparisonAiKind
{
    CommentSummary = 0,
    Analysis = 1,
}
