export interface FaqItem {
    question: string;
    answer: string;
}

export default function PerfumeFaqSection({
    items,
    perfumeName,
}: {
    items?: FaqItem[];
    perfumeName: string;
}) {
    if (!items || items.length === 0) return null;

    return (
        <section className="block detail-faq-block" id="sss" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="block-title">
                {perfumeName} Sıkça Sorulan Sorular
            </h2>
            <div className="faq-list">
                {items.map((item, idx) => (
                    <details key={idx} className="faq-item" open={idx === 0}>
                        <summary className="faq-trigger">
                            <span className="faq-q">{item.question}</span>
                            <span className="faq-chevron" aria-hidden="true">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </span>
                        </summary>
                        <div className="faq-answer">
                            <p>{item.answer}</p>
                        </div>
                    </details>
                ))}
            </div>
        </section>
    );
}
