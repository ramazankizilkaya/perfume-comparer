"use client";

import { useAuth } from "@/lib/stores";
import { openLogin } from "@/lib/loginModal";

/**
 * Giriş yapılmışsa içeriği (ör. yorum formu) gösterir; yapılmamışsa tek satırlık
 * bir giriş düğmesi koyar. Düğme giriş penceresini açar, kullanıcı sayfadan ayrılmaz.
 */
export default function LoginPrompt({
    children,
    label = "Yorum yapmak için giriş yapın",
    renderBeforeHydration = false,
}: {
    children: React.ReactNode;
    label?: string;
    /**
     * true ise giriş düğmesi sunucu HTML'inde de yer alır (ör. yönetim sayfası: botlar ve
     * curl de "giriş gerekli" mesajını görür). Varsayılan false: giriş yapmış kullanıcıya
     * bir anlığına "giriş yapın" yazısı görünmesin diye hydration beklenir.
     */
    renderBeforeHydration?: boolean;
}) {
    const { user, ready } = useAuth();

    if (!ready && !renderBeforeHydration) return null;

    if (!user) {
        return (
            <p className="login-prompt">
                <button type="button" className="link-more" onClick={openLogin}>
                    {label}
                </button>
            </p>
        );
    }

    return <>{children}</>;
}
