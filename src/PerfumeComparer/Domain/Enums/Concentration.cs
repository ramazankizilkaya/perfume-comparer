namespace PerfumeComparer.Domain;

/// <summary>Parfüm tipi / konsantrasyon. Sıra (enum değeri) = eski SortOrder.</summary>
public enum Concentration
{
    EauFraiche, // Eau Fraiche
    Edc,        // Eau de Cologne
    Cologne,    // Cologne
    Edt,        // Eau de Toilette
    Edp,        // Eau de Parfum
    Parfum,     // Parfum
    Extrait,    // Extrait de Parfum
    RollOn,     // Roll-on
    Other       // Diğer
}
