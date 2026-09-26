"use client";

import { useEffect, useState } from "react";
import { toast, type ToastItem } from "@/lib/toast";
import Icon from "./Icon";

export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const unsubscribe = toast.subscribe((updated) => {
            setToasts(updated);
        });
        return () => unsubscribe();
    }, []);

    if (toasts.length === 0) return null;

    return (
        <aside
            className="toast-container"
            aria-live="polite"
            aria-relevant="additions text"
            role="region"
            aria-label="Bildirimler"
        >
            {toasts.map((t) => (
                <div key={t.id} className={`toast-item toast-${t.type}`} role="status">
                    <div className="toast-icon-wrap">
                        {t.type === "success" && <Icon name="check" size={16} />}
                        {t.type === "error" && <Icon name="close" size={16} />}
                        {t.type === "info" && <Icon name="bell" size={16} />}
                        {t.type === "warning" && <Icon name="bell" size={16} />}
                    </div>
                    <div className="toast-message">{t.message}</div>
                    <button
                        type="button"
                        className="toast-close-btn"
                        onClick={() => toast.dismiss(t.id)}
                        aria-label="Kapat"
                    >
                        <Icon name="close" size={12} />
                    </button>
                </div>
            ))}
        </aside>
    );
}
