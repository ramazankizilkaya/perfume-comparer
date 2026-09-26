import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { SITE_URL } from "@/lib/seo";

// Hem sunucuda (blog detayı SSR) hem tarayıcıda (editör/önizleme) çalışır.
// isomorphic-dompurify sunucuda jsdom, tarayıcıda ise DOMPurify'ın yerel motorunu kullanır.

const SITE_HOST = new URL(SITE_URL).host;

/**
 * Link sitenin kendi adresine mi gidiyor? Karar adresin baş kısmına göre değil, çözülmüş
 * host adına göre verilir. Böylece "https://auracompare.com.spam.com" veya "//spam.com"
 * gibi adresler site içi sanılmaz.
 */
function isInternalHref(href: string): boolean {
    try {
        return new URL(href, SITE_URL).host === SITE_HOST;
    } catch {
        return false;
    }
}

// Site dışına giden linklere rel="nofollow ugc noopener" ve target="_blank" eklenir.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
        const href = (node.getAttribute("href") || "").trim();
        if (isInternalHref(href)) {
            node.removeAttribute("target");
            node.removeAttribute("rel");
        } else {
            node.setAttribute("rel", "nofollow ugc noopener");
            node.setAttribute("target", "_blank");
        }
    }
});

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
        marked.setOptions({
            gfm: true,
            breaks: true,
        });

        const parsed = marked.parse(content);
        const rawHtml = typeof parsed === "string" ? parsed : content;

        // XSS ve zararlı HTML enjeksiyonuna karşı sıkı temizleme
        return DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: [
                "h1", "h2", "h3", "h4", "h5", "h6",
                "p", "strong", "em", "b", "i", "u", "s",
                "ul", "ol", "li",
                "blockquote",
                "table", "thead", "tbody", "tr", "th", "td",
                "a", "img",
                "code", "pre",
                "br", "hr",
                "span", "div"
            ],
            // "class" bilinçli olarak yok: kullanıcı sitenin kendi CSS sınıflarıyla (örn. "sr-only")
            // görünmez spam linki gizleyemesin. "style" da aynı nedenle kapalı.
            ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "width", "height"],
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            FORBID_TAGS: ["script", "iframe", "style", "object", "embed", "link"],
            FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
        });
    } catch (e) {
        console.error("Markdown parse or sanitize error:", e);
        return "";
    }
}
