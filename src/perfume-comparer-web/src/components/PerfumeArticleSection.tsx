import type { ReactNode } from "react";

function formatBoldText(text: string): ReactNode[] {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}

export default function PerfumeArticleSection({
    article,
    perfumeName,
}: {
    article?: string;
    perfumeName: string;
}) {
    if (!article || !article.trim()) return null;

    // Split markdown sections by "## "
    const rawSections = article.split(/(?=^##\s+)/m).filter(Boolean);

    return (
        <section className="block detail-article-block" id="inceleme" aria-labelledby="article-heading">
            <h2 id="article-heading" className="block-title">
                {perfumeName} Detaylı İnceleme ve Koku Değerlendirmesi
            </h2>
            <article className="article-body">
                {rawSections.map((sec, idx) => {
                    const lines = sec.trim().split("\n");
                    const isHeading = lines[0].startsWith("## ");
                    const headingText = isHeading ? lines[0].replace(/^##\s+/, "").trim() : null;
                    const bodyText = isHeading ? lines.slice(1).join("\n").trim() : sec.trim();

                    return (
                        <div key={idx} className="article-section">
                            {headingText && <h3 className="article-section-heading">{headingText}</h3>}
                            <div className="article-section-content">
                                {bodyText.split("\n\n").map((para, pIdx) => {
                                    const cleaned = para.trim();
                                    if (!cleaned) return null;
                                    return <p key={pIdx}>{formatBoldText(cleaned)}</p>;
                                })}
                            </div>
                        </div>
                    );
                })}
            </article>
        </section>
    );
}
