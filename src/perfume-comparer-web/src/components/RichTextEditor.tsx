"use client";

import { useRef, useState } from "react";
import RichTextRenderer from "./RichTextRenderer";

interface RichTextEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    onOpenPreviewPage?: () => void;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = "Makalenizi buraya yazın... (Markdown ve zengin metin desteklenir)",
    onOpenPreviewPage,
}: RichTextEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

    const insertFormatting = (prefix: string, suffix: string = "", defaultText: string = "") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = value.substring(start, end) || defaultText;
        const replacement = `${prefix}${selected}${suffix}`;

        const newValue = value.substring(0, start) + replacement + value.substring(end);
        onChange(newValue);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + prefix.length,
                start + prefix.length + selected.length
            );
        }, 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "b") {
            e.preventDefault();
            insertFormatting("**", "**", "kalın metin");
        } else if ((e.ctrlKey || e.metaKey) && e.key === "i") {
            e.preventDefault();
            insertFormatting("*", "*", "italik metin");
        }
    };

    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    const charCount = value.length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
        <div className="rich-editor-wrapper">
            <div className="rich-editor-header">
                <div className="rich-editor-tabs">
                    <button
                        type="button"
                        className={`rich-tab-btn ${activeTab === "edit" ? "active" : ""}`}
                        onClick={() => setActiveTab("edit")}
                    >
                        ✏️ Düzenle
                    </button>
                    <button
                        type="button"
                        className={`rich-tab-btn ${activeTab === "preview" ? "active" : ""}`}
                        onClick={() => setActiveTab("preview")}
                    >
                        👁️ Anlık Önizleme
                    </button>
                </div>

                {onOpenPreviewPage && (
                    <button
                        type="button"
                        className="btn btn-outline btn-sm rich-editor-preview-btn"
                        onClick={onOpenPreviewPage}
                        title="Makaleyi tam sayfa olarak ayrı bir sekmede/sayfada gör"
                    >
                        ↗️ Ayrı Sayfada Önizle
                    </button>
                )}
            </div>

            {activeTab === "edit" && (
                <>
                    <div className="rich-editor-toolbar" role="toolbar" aria-label="Metin biçimlendirme araçları">
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Kalın (Ctrl+B)"
                            onClick={() => insertFormatting("**", "**", "kalın metin")}
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="İtalik (Ctrl+I)"
                            onClick={() => insertFormatting("*", "*", "italik metin")}
                        >
                            <em>I</em>
                        </button>
                        <span className="toolbar-divider" />
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Ana Başlık (H2)"
                            onClick={() => insertFormatting("\n## ", "\n", "Başlık 2")}
                        >
                            H2
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Alt Başlık (H3)"
                            onClick={() => insertFormatting("\n### ", "\n", "Başlık 3")}
                        >
                            H3
                        </button>
                        <span className="toolbar-divider" />
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Madde İmli Liste"
                            onClick={() => insertFormatting("\n- ", "\n", "Liste maddesi")}
                        >
                            • Liste
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Numaralı Liste"
                            onClick={() => insertFormatting("\n1. ", "\n", "Numaralı madde")}
                        >
                            1. Liste
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Alıntı Kutusu"
                            onClick={() => insertFormatting("\n> ", "\n", "Önemli alıntı veya not")}
                        >
                            ❝ Alıntı
                        </button>
                        <span className="toolbar-divider" />
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Tablo Şablonu Ekle"
                            onClick={() =>
                                insertFormatting(
                                    "\n| Özellik | Açıklama | Puan |\n| :--- | :--- | :--- |\n| Kalıcılık | 8-10 Saat | 9/10 |\n| Silaj | Geniş Alan | 8.5/10 |\n"
                                )
                            }
                        >
                            📊 Tablo
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Bağlantı (Link)"
                            onClick={() => insertFormatting("[", "](https://aura-compare.com)", "bağlantı metni")}
                        >
                            🔗 Link
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Görsel Ekle"
                            onClick={() => insertFormatting("![Görsel Açıklaması](", ")", "https://örnek-resim-url.com/resim.webp")}
                        >
                            🖼️ Resim
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            title="Ayırıcı Çizgi"
                            onClick={() => insertFormatting("\n---\n")}
                        >
                            ― Çizgi
                        </button>
                    </div>

                    <textarea
                        ref={textareaRef}
                        id="b-body"
                        className="rich-editor-textarea"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        required
                    />
                </>
            )}

            {activeTab === "preview" && (
                <div className="rich-editor-inline-preview">
                    {value.trim() ? (
                        <RichTextRenderer content={value} />
                    ) : (
                        <p className="preview-empty">Henüz içerik yazmadınız. Yazdıklarınız burada anlık biçimlendirilmiş olarak görünecektir.</p>
                    )}
                </div>
            )}

            <div className="rich-editor-footer">
                <span className="editor-stat">{wordCount} kelime · {charCount} karakter</span>
                <span className="editor-stat">Yaklaşık {readingTime} dakika okuma</span>
            </div>
        </div>
    );
}
