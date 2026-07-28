using System.ComponentModel.DataAnnotations;

namespace PerfumeComparer.Business.Dtos;

public record SearchQuery(
    [Required(AllowEmptyStrings = false, ErrorMessage = "Arama sorgusu boş olamaz.")]
    [MinLength(3, ErrorMessage = "Arama sorgusu en az 3 karakter olmalıdır.")]
    string Q,

    [Range(1, int.MaxValue, ErrorMessage = "Sayfa numarası 1 veya daha büyük olmalıdır.")]
    int Page = 1,

    [Range(1, 100, ErrorMessage = "Sayfa boyutu 1 ile 100 arasında olmalıdır.")]
    int PageSize = 24);
