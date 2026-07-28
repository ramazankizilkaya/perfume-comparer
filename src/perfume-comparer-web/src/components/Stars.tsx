/**
 * Puan yıldızları. Verilen yıldız sarı, verilmeyen yıldız beyaz (ince gri
 * konturlu) görünür. İki üst üste satır kullanılır (boş + dolu); dolu satır
 * yüzdeye göre kırpılır, böylece 3.4 gibi ondalıklı puanlar da doğru dolar
 * ve sunucu/istemci HTML'i her zaman aynı olur (üretilen SVG id'si yok).
 */

const STAR_PATH =
    "M12 2.6 15.09 8.86 22 9.87l-5 4.87 1.18 6.88L12 18.37l-6.18 3.25L7 14.74l-5-4.87 6.91-1.01z";

function Row({ filled, size }: { filled: boolean; size: number }) {
    return (
        <span className={filled ? "stars-fg" : "stars-bg"} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24" focusable="false">
                    <path d={STAR_PATH} strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
            ))}
        </span>
    );
}

interface StarsProps {
    value: number;
    size?: number;
    count?: number;
    showValue?: boolean;
}

export default function Stars({ value, size = 18, count, showValue = false }: StarsProps) {
    const score = Math.max(0, Math.min(5, Number(value) || 0));
    const pct = `${(score / 5) * 100}%`;

    return (
        <span className="rating-line">
            <span
                className="stars"
                style={{ ["--fill" as string]: pct }}
                role="img"
                aria-label={`5 üzerinden ${score.toFixed(1)}`}
            >
                <Row filled={false} size={size} />
                <Row filled size={size} />
            </span>
            {showValue && <strong className="rating-value">{score.toFixed(1)}</strong>}
            {count !== undefined && <span>({count})</span>}
        </span>
    );
}

/** Yorum formundaki tıklanabilir puanlama. */
export function StarInput({
    value, onChange, size = 30,
}: { value: number; onChange: (n: number) => void; size?: number }) {
    return (
        <span className="star-input">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    className={n <= value ? "on" : ""}
                    onClick={() => onChange(n)}
                    aria-label={`${n} yıldız`}
                    aria-pressed={n <= value}
                >
                    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
                        <path d={STAR_PATH} strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                </button>
            ))}
        </span>
    );
}
