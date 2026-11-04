using System;
using System.Collections.Generic;

namespace PerfumeComparer.Business.Dtos;

/// <summary>
/// İletişim formu gövdesi. <c>Website</c> görünmeyen tuzak alanıdır (honeypot): insan
/// onu göremez ve boş bırakır, formu kör dolduran bot doldurur. <c>FormToken</c> formun
/// açıldığı anı imzalı taşır; çok hızlı gönderim ve formu hiç açmadan gönderim bununla yakalanır.
/// </summary>
public record ContactMessageRequest(
    string? Name,
    string? Email,
    string? Message,
    string? Website,
    string? FormToken
);

public enum ContactSubmitStatus
{
    /// <summary>Mesaj kaydedildi.</summary>
    Saved,
    /// <summary>Bot olduğu anlaşıldı; kaydedilmedi ama bota başarılı yanıt verilir.</summary>
    Ignored,
    /// <summary>Alanlardan biri geçersiz ya da form jetonu tutmuyor.</summary>
    Invalid,
    /// <summary>Aynı IP adresinden son bir saatte çok fazla mesaj geldi.</summary>
    TooMany,
}

public record ContactSubmitResult(ContactSubmitStatus Status, string Message);

public record ContactMessageDto(
    int Id,
    string Name,
    string Email,
    string Message,
    bool IsRead,
    DateTimeOffset CreatedAt
);

public record ContactMessageListDto(
    IReadOnlyList<ContactMessageDto> Items,
    int UnreadCount,
    int Total
);
