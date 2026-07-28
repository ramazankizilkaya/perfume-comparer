namespace PerfumeComparer.Domain;

/// <summary>
/// Parfümün SEO dostu kanonik yol parçalarını üretir:
/// <c>erkek/edp/carolina-herrera/carolina-herrera-bad-boy-cobalt-absolute-edp</c>
/// Frontend bunun başına <c>/parfum/</c> ekler.
/// Tek kaynak burası olsun ki breadcrumb ile linkler asla ayrışmasın.
/// </summary>
public static class PerfumeUrl
{
    public static string GenderSlug(Gender gender) => gender switch
    {
        Gender.Male => "erkek",
        Gender.Female => "kadin",
        _ => "unisex",
    };

    public static string GenderLabel(Gender gender) => gender switch
    {
        Gender.Male => "Erkek",
        Gender.Female => "Kadın",
        _ => "Unisex",
    };

    /// <summary>Ham SQL sorgularından gelen string cinsiyet değeri için ("Male"/"Female"/"Unisex").</summary>
    public static string GenderSlug(string genderName) =>
        Enum.TryParse<Gender>(genderName, ignoreCase: true, out var parsed)
            ? GenderSlug(parsed)
            : "unisex";

    public static string Path(string genderName, string? concentrationSlug, string brandSlug, string perfumeSlug) =>
        Path(
            Enum.TryParse<Gender>(genderName, ignoreCase: true, out var parsed) ? parsed : Gender.Unisex,
            concentrationSlug, brandSlug, perfumeSlug);

    public static string Path(Gender gender, string? concentrationSlug, string brandSlug, string perfumeSlug)
    {
        var segments = new List<string>(4) { GenderSlug(gender) };

        if (!string.IsNullOrWhiteSpace(concentrationSlug))
            segments.Add(concentrationSlug);

        segments.Add(brandSlug);
        segments.Add(perfumeSlug);

        return string.Join('/', segments);
    }
}
