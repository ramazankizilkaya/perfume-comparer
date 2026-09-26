"use client";

import Link from "next/link";

/**
 * API'ye ulaşılamadığında gösterilir. Sunucu bu durumda 500 döner; böylece geçici
 * bir kesinti arama motorlarına "sayfa silindi" (404) diye bildirilmez.
 */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
    return (
        <div className="state">
            <h1 className="page-title">Bir sorun oluştu</h1>
            <p>Sayfa şu anda yüklenemedi. Lütfen biraz sonra tekrar deneyin.</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
                <button type="button" className="btn btn-primary" onClick={reset}>
                    Tekrar dene
                </button>
                <Link href="/tr" className="btn btn-ghost">
                    Anasayfaya dön
                </Link>
            </div>
        </div>
    );
}
