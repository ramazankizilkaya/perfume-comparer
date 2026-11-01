using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace PerfumeComparer.Business.Services;

/// <summary>
/// Yaygın Türkçe küfür ve argoyu yakalar. Kasıtlı olarak dar tutulmuştur: "aptal", "bok"
/// gibi sert ama sık kullanılan eleştiri kelimeleri engellenmez, yalnızca cinsel küfürler
/// ve ağır hakaretler engellenir.
/// </summary>
/// <remarks>
/// Metin önce sadeleştirilir (büyük/küçük harf, görünmez karakterler), sonra sırayla
/// "s i k", "s1k" ve "siiik" gibi gizleme yöntemleri açılarak her aşamada yeniden taranır.
/// Dotless <c>ı</c> bilerek <c>i</c> yapılmaz: "sıkım" (parfüm sıkımı) ile "sikim" karışmasın.
/// Diyakritiksiz yazılan "got" gibi İngilizce kelimeyle çakışanlar bilerek sözlükte yoktur.
/// </remarks>
public sealed class CommentContentFilter : ICommentContentFilter
{
    /// <summary>Yorum reddedildiğinde kullanıcıya gösterilen mesaj.</summary>
    public const string RejectedMessage = "Yorumunuzda uygunsuz ifadeler var. Lütfen düzenleyip tekrar gönderin.";

    private const string WordChar = @"[\p{L}\p{N}@$]";

    /// <summary>
    /// Her satır tek bir kelime ailesidir. Çoğunda ekli hâllerini yakalamak için sonda
    /// <c>\w*</c> vardır; "sik", "göt" gibi masum kelimelerle başlayabilenler ise ek listesini
    /// açıkça yazar ("sikke", "götürmek" eşleşmesin).
    /// </summary>
    private static readonly string[] Terms =
    [
        // sik: "sikke", "sıkım", "sıkıntı" eşleşmez; yalnızca sik, sikim, siktir ve fiil çekimleri.
        @"\bsik(?:im\w*|ik(?:ler)?|iş|is|eyim|erim|[ei]cem|ecek\w*|mek|meyin)?\b",
        @"\bsik{1,2}t\w*",
        @"\bs[ıi]ç(?:mak|t[ıi]\w*|ar[ıi]m|ay[ıi]m)\b",
        // am: "ama", "amca", "amber" eşleşmez.
        @"\bam[kq]\b",
        @"\baq\b",
        @"\bamc[ıiu][kğg]\w*",
        @"\bamın[aı]\w*",
        @"\bamın\s*(?:oğl|evlad)\w*",
        @"\bamina\s*(?:koy|sok)\w*",
        // yarrak / taşak (daşşak, tassak ... yazımları dahil)
        @"\b(?:dal)?yarr?a[kğg]\w*",
        @"\b[td][aâ][sş]{1,2}[aâ][kğg]\w*",
        // göt: "götürmek" eşleşmez.
        @"\bgöt(?:ü(?:m|n\w*)?|e|te|ten|ler\w*|veren\w*|oş\w*|lek)?\b",
        @"\bor[uo]s[pb]u\w*",
        @"\bpiç\w*",
        @"\bibne\w*",
        @"\bpezevenk\w*",
        @"\bgavat\w*",
        @"\bkahpe\w*",
        @"\bkaltak\w*",
        @"\byav[sş]ak\w*",
        @"\bpuşt\w*",
        @"\bfahi[sş]e\w*",
        @"\bsürtük\w*",
        @"\bkancık\w*",
        @"\bş[ıi]llık\w*",
        @"\bkeva[sş]e\w*",
        @"\boç\b",
        // döl: "döllenme" gibi biyoloji kelimeleri eşleşmez.
        @"\bdöl(?:ü|ün\w*|süz\w*)?\b",
        @"\byarram\w*",
        @"\bkoduğum\w*",
    ];

    private static readonly Regex Profanity = new(string.Join('|', Terms), RegexOptions.Compiled | RegexOptions.CultureInvariant);

    /// <summary>"s i k t i r", "s.i.k.t.i.r": en az üç tek harf, araları boşluk ya da noktalama.</summary>
    private static readonly Regex SpelledOut = new(
        $@"(?<!{WordChar}){WordChar}(?:[\s.\-_*,]+{WordChar}){{2,}}(?!{WordChar})",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex Separators = new(@"[\s.\-_*,]+", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex Token = new($"{WordChar}+", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    /// <summary>"siiiktir" -> "siktir": aynı harfin üç ya da daha fazla tekrarı tek harfe iner.</summary>
    private static readonly Regex Stretched = new(@"(\p{L})\1{2,}", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public bool ContainsProfanity(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;

        var plain = Simplify(text);
        if (Profanity.IsMatch(plain)) return true;

        var joined = SpelledOut.Replace(plain, m => Separators.Replace(m.Value, ""));
        if (Profanity.IsMatch(joined)) return true;

        var decoded = DecodeSymbols(joined);
        if (Profanity.IsMatch(decoded)) return true;

        return Profanity.IsMatch(Stretched.Replace(decoded, "$1"));
    }

    /// <summary>
    /// Küçük harfe indirir ve görünmez karakterleri atar. <c>I</c> ve <c>İ</c> ikisi de
    /// <c>i</c> olur ("SIKTIR" yakalansın); küçük <c>ı</c> olduğu gibi kalır.
    /// </summary>
    private static string Simplify(string text)
    {
        var sb = new StringBuilder(text.Length);
        foreach (var ch in text.Normalize(NormalizationForm.FormC))
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category is UnicodeCategory.Format or UnicodeCategory.NonSpacingMark) continue;

            sb.Append(ch == 'İ' ? 'i' : char.ToLowerInvariant(ch));
        }

        return sb.ToString();
    }

    /// <summary>
    /// "s1ktir", "$iktir", "y4rr4k" gibi rakam/simge ile yazılmış kelimeleri harfe çevirir.
    /// Yalnızca harf de içeren kelimeler çevrilir; "50" ya da "100 ml" fiyatı/miktarı bozulmaz.
    /// </summary>
    private static string DecodeSymbols(string text) => Token.Replace(text, m =>
    {
        var word = m.Value;
        if (!word.Any(char.IsLetter) || word.All(c => char.IsLetter(c))) return word;

        var sb = new StringBuilder(word.Length);
        foreach (var c in word)
        {
            sb.Append(c switch
            {
                '0' => 'o',
                '1' => 'i',
                '3' => 'e',
                '4' => 'a',
                '5' => 's',
                '7' => 't',
                '@' => 'a',
                '$' => 's',
                _ => c,
            });
        }

        return sb.ToString();
    });
}
