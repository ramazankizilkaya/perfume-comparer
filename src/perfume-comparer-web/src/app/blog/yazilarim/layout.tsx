import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";

// Kullanıcıya özel veya yönetim sayfası: arama sonuçlarında görünmemeli.
export const metadata: Metadata = { title: "Yazılarım", ...NO_INDEX };

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
    return children;
}
