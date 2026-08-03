namespace PerfumeComparer.Domain;

/// <summary>İki parfüm arasındaki ilişkinin türü (kaynak: Fragrantica).</summary>
public enum PerfumeRelationKind
{
    /// <summary>"Bana şunu hatırlatıyor" — kokusal benzerlik.</summary>
    RemindsMeOf,

    /// <summary>"Bunu sevenler şunu da sever" — kullanıcı davranışı benzerliği.</summary>
    PeopleAlsoLike
}
