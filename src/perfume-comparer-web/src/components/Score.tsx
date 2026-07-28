/**
 * Puan rozeti — 0-5 arası ortalama puanı 100'lük bir skora çevirir ve
 * değerine göre renklendirir (yüksek=yeşil, orta=amber, düşük=kırmızı).
 * Bilgi portalı hissi için tablolarda ve kartlarda tek bakışta okunur bir işaret.
 */

interface ScoreProps {
    /** 0-5 arası ortalama puan */
    value: number;
    /** kaç değerlendirmeye dayandığı (0 ise nötr gösterilir) */
    count?: number;
    lg?: boolean;
    caption?: string;
}

export default function Score({ value, count, lg = false, caption = "puan" }: ScoreProps) {
    const rating = Math.max(0, Math.min(5, Number(value) || 0));
    const puan = Math.round((rating / 5) * 100);
    const hasData = puan > 0 && (count === undefined || count > 0);

    const tier = !hasData ? "" : puan >= 80 ? "score-hi" : puan >= 60 ? "score-mid" : "score-lo";
    const cls = `score ${tier} ${lg ? "score-lg" : ""}`.trim();

    return (
        <span
            className={cls}
            style={!hasData ? { background: "var(--line-strong)", color: "var(--ink-soft)" } : undefined}
            title={hasData ? `100 üzerinden ${puan}` : "Yeterli değerlendirme yok"}
        >
            <span className="score-num">{hasData ? puan : "—"}</span>
            {lg && <span className="score-cap">{caption}</span>}
        </span>
    );
}
