import { marked } from "marked";

// "use client" bilinçli olarak yok: blog sayfasında markdown sunucuda HTML'e çevrilir,
// böylece marked kütüphanesi o sayfada tarayıcıya gönderilmez. Editör ve önizleme gibi
// istemci bileşenlerinden çağrıldığında ise tarayıcıda çalışır.

interface RichTextRendererProps {
    content: string;
    className?: string;
}

export default function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
    const htmlContent = toHtml(content);

    return (
        <div
            className={`article-rich-content ${className}`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
}

function toHtml(content: string): string {
    if (!content) return "";
    try {
        // Configure marked options
        marked.setOptions({
            gfm: true,
            breaks: true,
        });

        const parsed = marked.parse(content);
        if (typeof parsed === "string") {
            return parsed;
        }
        return content;
    } catch (e) {
        console.error("Markdown parse error:", e);
        return content;
    }
}
