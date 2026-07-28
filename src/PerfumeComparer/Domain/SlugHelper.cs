using System.Text;

namespace PerfumeComparer.Domain;

public static class SlugHelper
{
    /// <summary>
    /// SEO dostu, Türkçe karakterleri sadeleştiren slug üretir.
    /// "Kış İçin Oud & Vanilya" -> "kis-icin-oud-vanilya"
    /// </summary>
    public static string Slugify(string text)
    {
        var sb = new StringBuilder(text.Length);
        var lastWasDash = true; // baştaki tireleri engelle

        foreach (var ch in text)
        {
            var mapped = ch switch
            {
                'ç' or 'Ç' => "c",
                'ğ' or 'Ğ' => "g",
                'ı' or 'I' => "i",
                'İ' => "i",
                'ö' or 'Ö' => "o",
                'ş' or 'Ş' => "s",
                'ü' or 'Ü' => "u",
                'â' or 'Â' => "a",
                'î' or 'Î' => "i",
                'û' or 'Û' => "u",
                _ when char.IsAsciiLetterOrDigit(ch) => char.ToLowerInvariant(ch).ToString(),
                _ => null
            };

            if (mapped is null)
            {
                if (!lastWasDash)
                {
                    sb.Append('-');
                    lastWasDash = true;
                }
            }
            else
            {
                sb.Append(mapped);
                lastWasDash = false;
            }
        }

        return sb.ToString().TrimEnd('-');
    }
}
