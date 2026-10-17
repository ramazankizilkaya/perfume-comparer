"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/stores";
import { loginHref } from "@/lib/urls";

/**
 * Giriş yapılmışsa içeriği (ör. yorum formu) gösterir; yapılmamışsa tek satırlık
 * bir giriş linki koyar. Giriş akışının tamamı /giris sayfasında.
 */
export default function LoginPrompt({
    children,
    label = "Yorum yapmak için giriş yapın",
    renderBeforeHydration = false,
}: {
    children: React.ReactNode;
    label?: string;
    /**
     * true ise giriş linki sunucu HTML'inde de yer alır (ör. yönetim sayfası: botlar ve
     * curl de "giriş gerekli" mesajını görür). Varsayılan false: giriş yapmış kullanıcıya
     * bir anlığına "giriş yapın" yazısı görünmesin diye hydration beklenir.
     */
    renderBeforeHydration?: boolean;
}) {
    const { user, ready } = useAuth();
    const pathname = usePathname();

    if (!ready && !renderBeforeHydration) return null;

    if (!user) {
        // Tarayıcıda adres çubuğundaki sorgu (?items=... gibi) da "next" içine alınır;
        // girişten sonra kullanıcı aynı yere döner. Sunucuda yalnızca yol bilinir.
        const next = `${pathname ?? ""}${ready && typeof window !== "undefined" ? window.location.search : ""}`;
        return (
            <p className="login-prompt">
                <Link href={loginHref(next)} className="link-more">
                    {label}
                </Link>
            </p>
        );
    }

    return <>{children}</>;
}
