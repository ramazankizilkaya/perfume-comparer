"use client";

import { useEffect } from "react";
import Icon from "./Icon";

interface ImageLightboxModalProps {
    src: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageLightboxModal({ src, alt, isOpen, onClose }: ImageLightboxModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={alt}>
            <button className="lightbox-close-btn" onClick={onClose} aria-label="Kapat">
                <Icon name="close" size={20} />
            </button>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                <img src={src} alt={alt} className="lightbox-image" />
                <span className="lightbox-caption">{alt}</span>
            </div>
        </div>
    );
}
