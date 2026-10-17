"use client";

import Link from "next/link";
import { localeHref } from "@/lib/urls";
import { RATE_LIMIT_DIGEST } from "@/lib/api";

/**
 * API'ye ulaşılamadığında gösterilir. Sunucu bu durumda 500 döner; böylece geçici
 * bir kesinti arama motorlarına "sayfa silindi" (404) diye bildirilmez.
 *
 * API hız sınırı (429) için sayfalar `digest = RATE_LIMIT_DIGEST` ile hata fırlatır;
 * Next bu alanı canlıda da istemciye taşıdığı için burada yoğunluğa özel, Türkçe ve
 * "biraz sonra tekrar deneyin" diyen bir mesaj gösterilebilir.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const rateLimited = error?.digest === RATE_LIMIT_DIGEST;

    return (
        <div className="state">
            <h1 className="page-title">{rateLimited ? "Şu anda çok yoğunuz" : "Bir sorun oluştu"}</h1>
            <p>
                {rateLimited
                    ? "Kısa süre içinde çok fazla istek aldık. Lütfen birkaç saniye bekleyip tekrar deneyin."
                    : "Sayfa şu anda yüklenemedi. Lütfen biraz sonra tekrar deneyin."}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
                <button type="button" className="btn btn-primary" onClick={reset}>
                    Tekrar dene
                </button>
                <Link href={localeHref("/")} className="btn btn-ghost">
                    Anasayfaya dön
                </Link>
            </div>
        </div>
    );
}
