"use client";

import { useMemo } from "react";
import { marked } from "marked";

interface RichTextRendererProps {
    content: string;
    className?: string;
}

export default function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
    const htmlContent = useMemo(() => {
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
    }, [content]);

    return (
        <div
            className={`article-rich-content ${className}`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
}
