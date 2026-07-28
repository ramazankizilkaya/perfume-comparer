"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/stores";

/**
 * Giriş yapılmışsa içeriği (ör. yorum formu) gösterir; yapılmamışsa tek satırlık
 * bir giriş linki koyar. Giriş akışının tamamı /giris sayfasında.
 */
export default function LoginPrompt({
    children,
    label = "Yorum yapmak için giriş yapın",
}: {
    children: React.ReactNode;
    label?: string;
}) {
    const { user, ready } = useAuth();
    const pathname = usePathname();

    if (!ready) return null;

    if (!user) {
        return (
            <p className="login-prompt">
                <Link href={`/giris?next=${encodeURIComponent(pathname)}`} className="link-more">
                    {label}
                </Link>
            </p>
        );
    }

    return <>{children}</>;
}
