"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useAuth } from "@/lib/stores";
import { API_BASE, privacyHref } from "@/lib/urls";

const MAX_NAME = 100;
const MAX_EMAIL = 200;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 4000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Note = { ok: boolean; text: string } | null;
type Field = "name" | "email" | "message";
type FieldErrors = Partial<Record<Field, string>>;

/**
 * Tarayıcının kendi uyarıları tarayıcı diline göre (çoğu zaman İngilizce) çıkar; bu yüzden
 * form noValidate ile açılır ve kurallar burada Türkçe mesajla denetlenir. Kurallar
 * sunucudaki ContactMessageService ile aynıdır.
 */
function validate(name: string, email: string, message: string): FieldErrors {
    const errors: FieldErrors = {};
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMessage = message.trim();

    if (!cleanName) errors.name = "Lütfen adınızı ve soyadınızı yazın.";
    else if (cleanName.length < 2) errors.name = "Ad soyad en az 2 karakter olmalıdır.";

    if (!cleanEmail) errors.email = "Lütfen e-posta adresinizi yazın.";
    else if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = "Lütfen geçerli bir e-posta adresi yazın (örnek: ad@ornek.com).";

    if (!cleanMessage) errors.message = "Lütfen mesajınızı yazın.";
    else if (cleanMessage.length < MIN_MESSAGE) errors.message = `Mesajınız en az ${MIN_MESSAGE} karakter olmalıdır.`;

    return errors;
}

/**
 * İletişim formu. Bot koruması sunucudadır; tarayıcı yalnızca iki parçayı taşır:
 * form açılınca alınan imzalı jeton (formToken) ve görünmeyen tuzak alan (website).
 * Gönderim başarılı olunca jeton yenilenir, çünkü sunucu her jetonu bir kez kabul eder.
 */
export default function ContactForm() {
    const { user } = useAuth();
    // null: kullanıcı alana henüz dokunmadı; girişli kullanıcının adı ve e-postası gösterilir.
    const [nameInput, setName] = useState<string | null>(null);
    const [emailInput, setEmail] = useState<string | null>(null);
    const name = nameInput ?? user?.name ?? "";
    const email = emailInput ?? user?.email ?? "";
    const [message, setMessage] = useState("");
    const [website, setWebsite] = useState("");
    const [formToken, setFormToken] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [note, setNote] = useState<Note>(null);
    const [sent, setSent] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    /** Kullanıcı hatalı alanı düzeltmeye başlayınca o alanın uyarısı kalkar. */
    const clearError = (field: Field) =>
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });

    const loadToken = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await fetch(`${API_BASE}/api/contact/form-token`, { signal, cache: "no-store" });
            const data = await res.json();
            if (!signal?.aborted && typeof data.token === "string") setFormToken(data.token);
        } catch {
            if (!signal?.aborted) setNote({ ok: false, text: "Form şu anda yüklenemedi. Lütfen sayfayı yenileyin." });
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            await loadToken(controller.signal);
        })();
        return () => controller.abort();
    }, [loadToken]);

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (sending) return;
        setNote(null);

        const found = validate(name, email, message);
        setErrors(found);
        const firstInvalid = (["name", "email", "message"] as Field[]).find((f) => found[f]);
        if (firstInvalid) {
            document.getElementById(`contact-${firstInvalid}`)?.focus();
            return;
        }

        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
                body: JSON.stringify({ name, email, message, website, formToken }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setSent(true);
                setMessage("");
                setNote({ ok: true, text: data.message ?? "Mesajınız bize ulaştı." });
                await loadToken();
            } else {
                setNote({ ok: false, text: data.message ?? "Mesaj gönderilemedi. Lütfen tekrar deneyin." });
            }
        } catch {
            setNote({ ok: false, text: "Sunucuya ulaşılamadı. Lütfen biraz sonra tekrar deneyin." });
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <div className="contact-sent" role="status">
                <Icon name="check" size={18} />
                <div>
                    <p><strong>{note?.text ?? "Mesajınız bize ulaştı."}</strong></p>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSent(false); setNote(null); }}>
                        Yeni mesaj yaz
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form className="contact-form" onSubmit={submit} noValidate>
            <div className="contact-form-row">
                <div className="form-group">
                    <label htmlFor="contact-name">Ad soyad</label>
                    <input
                        id="contact-name"
                        className="input"
                        name="name"
                        autoComplete="name"
                        maxLength={MAX_NAME}
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? "contact-name-error" : undefined}
                        value={name}
                        onChange={(e) => { setName(e.target.value); clearError("name"); }}
                    />
                    {errors.name && <span id="contact-name-error" className="contact-field-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="contact-email">E-posta</label>
                    <input
                        id="contact-email"
                        className="input"
                        type="email"
                        name="email"
                        autoComplete="email"
                        inputMode="email"
                        maxLength={MAX_EMAIL}
                        aria-invalid={errors.email ? true : undefined}
                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                    />
                    {errors.email && <span id="contact-email-error" className="contact-field-error">{errors.email}</span>}
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="contact-message">Mesajınız</label>
                <textarea
                    id="contact-message"
                    className="textarea contact-textarea"
                    name="message"
                    maxLength={MAX_MESSAGE}
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); clearError("message"); }}
                />
                <div className="contact-message-meta">
                    {errors.message && <span id="contact-message-error" className="contact-field-error">{errors.message}</span>}
                    <span className="form-subtext contact-counter">{message.length} / {MAX_MESSAGE}</span>
                </div>
            </div>

            {/* Tuzak alan: insanlar görmez, botlar doldurur. Doluysa sunucu mesajı kaydetmez. */}
            <div className="contact-hp" aria-hidden="true">
                <label htmlFor="contact-website">Web siteniz (boş bırakın)</label>
                <input
                    id="contact-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                />
            </div>

            <div className="contact-actions">
                <button type="submit" className="btn btn-primary" disabled={sending || !formToken}>
                    <Icon name="send" size={14} /> {sending ? "Gönderiliyor…" : "Gönder"}
                </button>
                <span className="faint contact-consent">
                    Formu göndererek bilgilerinizin size yanıt vermek için kullanılmasını kabul edersiniz.{" "}
                    <Link href={privacyHref()}>Gizlilik politikası</Link>
                </span>
            </div>

            {note && <p className={`form-note ${note.ok ? "ok" : "err"}`} role="alert">{note.text}</p>}
        </form>
    );
}
