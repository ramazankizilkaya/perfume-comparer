namespace PerfumeComparer.Business.Services;

/// <summary>
/// Kullanıcı yorumları kaydedilmeden önce çalışan temel küfür/argo denetimi.
/// Yalnızca sözlüğe dayanır; ağ çağrısı yapmaz ve her yorumda aynı sonucu verir.
/// </summary>
public interface ICommentContentFilter
{
    /// <summary>Metin yaygın bir küfür ya da argo ifadesi içeriyorsa <c>true</c> döner.</summary>
    bool ContainsProfanity(string? text);
}
