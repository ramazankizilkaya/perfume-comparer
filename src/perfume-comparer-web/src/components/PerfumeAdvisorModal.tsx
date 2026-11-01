"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { useAuth, authFetch } from "@/lib/stores";
import { openLogin } from "@/lib/loginModal";
import { API_BASE, perfumeHref, mediaUrl } from "@/lib/urls";
import { toast } from "@/lib/toast";

interface RecommendedPerfume {
    id: number;
    name: string;
    slug: string;
    brandName: string;
    brandSlug: string;
    gender: string;
    concentration?: string | null;
    concentrationSlug?: string | null;
    fragranceFamily?: string | null;
    fragranceFamilySlug?: string | null;
    imageUrl?: string | null;
    path: string;
    avgRating: number;
    ratingCount: number;
    topAccord?: string | null;
}

interface AdvisorResponse {
    success: boolean;
    message?: string | null;
    hasUsedToday: boolean;
    perfume?: RecommendedPerfume | null;
    perfumerAdvice?: string | null;
    createdAt?: string | null;
    nextAvailableAt?: string | null;
}

interface PerfumeAdvisorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OCCASION_OPTIONS = [
    { value: "Günlük / Ofis", label: "🏢 Günlük / Ofis" },
    { value: "Gece / Özel Davet", label: "✨ Gece / Özel Davet" },
    { value: "Dört Mevsim / İmza Koku", label: "🌟 Dört Mevsim / İmza" },
    { value: "Spor / Açık Hava", label: "🏃 Spor / Açık Hava" },
    { value: "Romantik / Buluşma", label: "🌹 Romantik" },
];

const SEASON_OPTIONS = [
    { value: "Dört Mevsim", label: "🔄 Dört Mevsim" },
    { value: "İlkbahar / Yaz", label: "☀️ İlkbahar / Yaz" },
    { value: "Sonbahar / Kış", label: "❄️ Sonbahar / Kış" },
];

export default function PerfumeAdvisorModal({ isOpen, onClose }: PerfumeAdvisorModalProps) {
    const { token, ready } = useAuth();
    const cardRef = useRef<HTMLDivElement>(null);

    const [loadingStatus, setLoadingStatus] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<AdvisorResponse | null>(null);

    // Form durumları
    const [gender, setGender] = useState<string>("unisex");
    const [likedPerfumes, setLikedPerfumes] = useState("");
    const [dislikedNotes, setDislikedNotes] = useState("");
    const [preferredNotes, setPreferredNotes] = useState("");
    const [occasion, setOccasion] = useState("Günlük / Ofis");
    const [season, setSeason] = useState("Dört Mevsim");
    const [freeText, setFreeText] = useState("");

    // Modal açıldığında klavye ve body overflow kontrolü
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

    // Kullanıcı giriş yaptıysa günlük durumunu sorgula
    useEffect(() => {
        if (!isOpen || !token) return;

        let active = true;

        const checkStatus = async () => {
            await Promise.resolve();
            if (!active) return;
            setLoadingStatus(true);
            try {
                const res = await authFetch(`${API_BASE}/api/perfume-advisor/status`);
                if (res.ok && active) {
                    const data: AdvisorResponse = await res.json();
                    if (data.hasUsedToday && data.perfume) {
                        setResult(data);
                    }
                }
            } catch {
                /* sessizce geç */
            } finally {
                if (active) setLoadingStatus(false);
            }
        };

        checkStatus();

        return () => {
            active = false;
        };
    }, [isOpen, token]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setSubmitting(true);
        try {
            const res = await authFetch(`${API_BASE}/api/perfume-advisor/recommend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gender,
                    likedPerfumes: likedPerfumes.trim(),
                    dislikedNotes: dislikedNotes.trim(),
                    preferredNotes: preferredNotes.trim(),
                    occasion,
                    season,
                    freeText: freeText.trim(),
                }),
            });

            const data: AdvisorResponse = await res.json();
            if (res.ok && data.perfume) {
                setResult(data);
                toast.success(data.message || "Parfümörünüzün seçimi hazır!");
            } else {
                toast.error(data.message || "Tavsiye üretilirken bir hata oluştu.");
            }
        } catch {
            toast.error("Bağlantı hatası oluştu, lütfen tekrar deneyin.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="review-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="advisor-modal-title">
            <div className="review-modal-card advisor-modal-card" ref={cardRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                {/* Başlık */}
                <div className="review-modal-head">
                    <div>
                        <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <Icon name="sparkle" size={13} />
                            Yapay Zekâ Parfüm Danışmanı
                        </span>
                        <h2 className="modal-title" id="advisor-modal-title">Bana Parfüm Öner</h2>
                    </div>
                    <button className="icon-btn" onClick={onClose} aria-label="Kapat">
                        <Icon name="close" size={16} />
                    </button>
                </div>

                {/* İçerik */}
                {!ready || !token ? (
                    <div className="review-modal-body">
                        <div className="advisor-login-box">
                            <div className="advisor-icon-circle">
                                <Icon name="sparkle" size={28} />
                            </div>
                            <h3>Parfümörünüz Sizi Bekliyor</h3>
                            <p>
                                Sevdiğiniz notaları, zevklerinizi ve kullanım ortamınızı analiz edip geniş koleksiyonumuzdan
                                size nokta atışı imza bir koku seçebilmemiz için lütfen hesabınıza giriş yapın.
                            </p>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={openLogin}
                                style={{ marginBlockStart: "0.5rem" }}
                            >
                                Giriş Yap veya Kayıt Ol
                            </button>
                        </div>
                    </div>
                ) : loadingStatus ? (
                    <div className="review-modal-body">
                        <div className="advisor-loading-box">
                            <Icon name="sparkle" size={32} className="advisor-spin" />
                            <p>Danışmanlık profiliniz yükleniyor…</p>
                        </div>
                    </div>
                ) : result?.perfume ? (
                    <div className="review-modal-body advisor-result-body">
                        {result.hasUsedToday && (
                            <div className="advisor-quota-badge">
                                <Icon name="sparkle" size={14} />
                                <span>Gününüzün Parfümör Tavsiyesi (Günde 1 kez tavsiye alabilirsiniz)</span>
                            </div>
                        )}

                        <div className="advisor-perfume-card">
                            {result.perfume.imageUrl ? (
                                <img
                                    src={mediaUrl(result.perfume.imageUrl)}
                                    alt={`${result.perfume.brandName} ${result.perfume.name} orijinal parfüm şişesi`}
                                    className="advisor-perfume-img"
                                />
                            ) : (
                                <div className="advisor-perfume-noimg">
                                    <Icon name="sparkle" size={28} />
                                </div>
                            )}

                            <div className="advisor-perfume-details">
                                <span className="advisor-brand-name">{result.perfume.brandName}</span>
                                <h3 className="advisor-perfume-title">{result.perfume.name}</h3>

                                <div className="advisor-meta-pills">
                                    <span className="advisor-pill">{result.perfume.gender}</span>
                                    {result.perfume.fragranceFamily && (
                                        <span className="advisor-pill">{result.perfume.fragranceFamily}</span>
                                    )}
                                    {result.perfume.concentration && (
                                        <span className="advisor-pill">{result.perfume.concentration}</span>
                                    )}
                                    {result.perfume.topAccord && (
                                        <span className="advisor-pill highlight">✨ {result.perfume.topAccord}</span>
                                    )}
                                    <span className="advisor-pill rating">⭐ {result.perfume.avgRating.toFixed(1)}</span>
                                </div>

                                <Link
                                    href={perfumeHref(result.perfume.path, result.perfume.slug)}
                                    className="btn btn-primary btn-sm advisor-detail-link"
                                    onClick={onClose}
                                >
                                    Parfümü İncele & Karşılaştır
                                    <Icon name="arrow-right" size={14} />
                                </Link>
                            </div>
                        </div>

                        {/* Parfümör Tavsiye Mektubu */}
                        <div className="advisor-letter">
                            <div className="advisor-letter-header">
                                <Icon name="sparkle" size={15} />
                                <strong>Baş Parfümörün Notu:</strong>
                            </div>
                            <div className="advisor-letter-content">
                                {result.perfumerAdvice?.split("\n\n").map((para, i) => (
                                    <p key={i}>{para}</p>
                                ))}
                            </div>
                        </div>

                        <div className="advisor-footer-note">
                            <span>Yeni bir öneri için yarın tekrar bekleriz.</span>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                                Kapat
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="review-modal-body" onSubmit={handleSubmit}>
                        <div className="advisor-intro-text">
                            Aşağıdaki soruları yanıtlayarak zevkinizi tarif edin. Butiğimizin baş parfümörü
                            veritabanımızdaki kokuları inceleyip sizin için en doğru parfümü seçsin.
                        </div>

                        {/* 1. Cinsiyet */}
                        <div className="field-group">
                            <label className="field-label">Kimin İçin Arıyorsunuz?</label>
                            <div className="advisor-segmented-pills">
                                {[
                                    { value: "erkek", label: "Erkek" },
                                    { value: "kadin", label: "Kadın" },
                                    { value: "unisex", label: "Unisex / Ortak" },
                                    { value: "", label: "Farketmez" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`advisor-seg-btn ${gender === opt.value ? "active" : ""}`}
                                        onClick={() => setGender(opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Beğendiği Parfümler */}
                        <div className="field-group">
                            <label className="field-label" htmlFor="liked-perfumes">
                                Beğendiğiniz Parfümler veya Kokular
                            </label>
                            <input
                                id="liked-perfumes"
                                type="text"
                                className="input"
                                placeholder="Örn: Dior Sauvage, Tom Ford Tobacco Vanille, Bleu de Chanel..."
                                value={likedPerfumes}
                                onChange={(e) => setLikedPerfumes(e.target.value)}
                            />
                        </div>

                        {/* 3. Sevmediği / Uzak Durmak İstediği Notalar */}
                        <div className="field-group">
                            <label className="field-label" htmlFor="disliked-notes">
                                Sevmediğiniz / Uzak Durmak İstediğiniz Kokular & Notalar
                            </label>
                            <input
                                id="disliked-notes"
                                type="text"
                                className="input"
                                placeholder="Örn: Ağır gül, aşırı tatlı vanilya, boğucu paçuli, deri..."
                                value={dislikedNotes}
                                onChange={(e) => setDislikedNotes(e.target.value)}
                            />
                        </div>

                        {/* 4. Sevdiği Notalar ve Koku Aileleri */}
                        <div className="field-group">
                            <label className="field-label" htmlFor="preferred-notes">
                                Sevdiğiniz Koku Aileleri & Notalar
                            </label>
                            <input
                                id="preferred-notes"
                                type="text"
                                className="input"
                                placeholder="Örn: Ferah narenciye, odunsu sedir, vetiver, deniz esintisi, bergamot..."
                                value={preferredNotes}
                                onChange={(e) => setPreferredNotes(e.target.value)}
                            />
                        </div>

                        {/* 5. Kullanım Ortamı */}
                        <div className="field-group">
                            <label className="field-label">Kullanım Amacı / Ortamı</label>
                            <div className="advisor-tag-pills">
                                {OCCASION_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`advisor-tag-btn ${occasion === opt.value ? "active" : ""}`}
                                        onClick={() => setOccasion(opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 6. Mevsim */}
                        <div className="field-group">
                            <label className="field-label">Mevsim Tercihi</label>
                            <div className="advisor-tag-pills">
                                {SEASON_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`advisor-tag-btn ${season === opt.value ? "active" : ""}`}
                                        onClick={() => setSeason(opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 7. Parfümöre Not (Serbest Metin) */}
                        <div className="field-group">
                            <label className="field-label" htmlFor="free-text">
                                Parfümöre Özel Notunuz (Serbest Anlatım)
                            </label>
                            <textarea
                                id="free-text"
                                className="input"
                                rows={3}
                                placeholder="Aklınızdaki kokuyu, uyandırmak istediğiniz hissi veya özel beklentilerinizi kendi cümlelerinizle anlatın…"
                                value={freeText}
                                onChange={(e) => setFreeText(e.target.value)}
                            />
                        </div>

                        {/* Gönder butonu */}
                        <div className="advisor-submit-wrap">
                            <button
                                type="submit"
                                className="btn btn-primary advisor-submit-btn"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Icon name="sparkle" size={16} className="advisor-spin" />
                                        <span>Parfümörünüz kokuyu seçiyor…</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="sparkle" size={16} />
                                        <span>Parfümörden Tavsiye Al</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
