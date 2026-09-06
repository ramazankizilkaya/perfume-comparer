"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import LoginPrompt from "./LoginPrompt";
import { API_BASE } from "@/lib/urls";

export default function BlogWriteSection() {
    const [writing, setWriting] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("");
    const [sending, setSending] = useState(false);
    const router = useRouter();

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSending(true);
        setStatus("");
        try {
            const res = await fetch(`${API_BASE}/api/blogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body: content }),
            });
            if (res.ok) {
                setStatus("Yazınız taslak olarak kaydedildi.");
                setTitle("");
                setContent("");
                router.refresh();
            } else {
                setStatus("Yazı kaydedilemedi.");
            }
        } catch {
            setStatus("Bağlantı hatası.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button
                    className="btn btn-ghost"
                    onClick={() => {
                        setWriting(!writing);
                        setStatus("");
                    }}
                >
                    {writing ? "Yazılara dön" : "Yazı yaz"}
                </button>
            </div>

            {writing && (
                <LoginPrompt label="Yazı göndermek için giriş yapın">
                    <form onSubmit={submit} className="panel" style={{ maxWidth: "68ch" }}>
                        <div className="form-group">
                            <label htmlFor="b-title">Başlık</label>
                            <input
                                id="b-title"
                                className="input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Örn: Yaz aylarında kalıcılığı artırmanın yolları"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="b-body">İçerik</label>
                            <textarea
                                id="b-body"
                                className="textarea"
                                style={{ minHeight: 220 }}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                            />
                        </div>
                        <button className="btn btn-primary" disabled={sending}>
                            <Icon name="send" size={14} /> Taslak olarak gönder
                        </button>
                        {status && <p className="form-note ok">{status}</p>}
                    </form>
                </LoginPrompt>
            )}
        </div>
    );
}
