"use client";

/**
 * Kök layout'un kendisi çökerse (ör. Header render hatası) gösterilir. Bu dosya
 * kök layout'un yerine geçtiği için <html> ve <body> etiketlerini kendisi yazar ve
 * globals.css yüklenmediğinden stiller satır içidir.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="tr">
            <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", background: "#F4F6F5", color: "#1F2A26" }}>
                <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 1rem", textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Bir sorun oluştu</h1>
                    <p style={{ marginBottom: "1.25rem" }}>Sayfa yüklenirken beklenmedik bir hata oldu. Lütfen tekrar deneyin.</p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{ padding: "0.6rem 1.2rem", borderRadius: 6, border: 0, background: "#0C6658", color: "#fff", cursor: "pointer", fontSize: "1rem" }}
                    >
                        Tekrar dene
                    </button>
                </main>
            </body>
        </html>
    );
}
