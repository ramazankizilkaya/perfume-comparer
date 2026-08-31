"use client";

import { useState, useRef } from "react";
import Icon from "./Icon";
import { API_BASE } from "@/lib/urls";
import { useAuth } from "@/lib/stores";
import Link from "next/link";

interface PerfumeReviewModalProps {
    slug: string;
    perfumeName: string;
    isOpen: boolean;
    onClose: () => void;
    onReviewSubmitted?: () => void;
    onPhotoUploaded?: (photo: { id: number; imageUrl: string; authorName: string; createdAt: string }) => void;
}

const LONGEVITY_OPTS = [
    { value: "very_weak", label: "Çok Az (1-2s)" },
    { value: "weak", label: "Az (2-4s)" },
    { value: "moderate", label: "Orta (4-6s)" },
    { value: "long_lasting", label: "Uzun (6-8s)" },
    { value: "eternal", label: "Çok Uzun (8s+)" },
];

const SILLAGE_OPTS = [
    { value: "intimate", label: "Ten Kokusu" },
    { value: "moderate", label: "Orta / Dengeli" },
    { value: "strong", label: "Güçlü" },
    { value: "enormous", label: "Çok Güçlü / Oda Dolduran" },
];

const PRICE_OPTS = [
    { value: "way_overpriced", label: "Çok Pahalı" },
    { value: "overpriced", label: "Pahalı" },
    { value: "ok", label: "Değerinde" },
    { value: "good_value", label: "Fırsat / Uygun" },
    { value: "great_value", label: "Çok Hesaplı" },
];

const GENDER_OPTS = [
    { value: "male", label: "Tamamen Erksi" },
    { value: "more_male", label: "Erkeğe Yakın" },
    { value: "unisex", label: "Unisex / Ortak" },
    { value: "more_female", label: "Kadına Yakın" },
    { value: "female", label: "Tamamen Kadınsı" },
];

const SEASON_OPTS = [
    { value: "spring", label: "🌸 İlkbahar" },
    { value: "summer", label: "☀️ Yaz" },
    { value: "autumn", label: "🍂 Sonbahar" },
    { value: "winter", label: "❄️ Kış" },
];

export default function PerfumeReviewModal({
    slug,
    perfumeName,
    isOpen,
    onClose,
    onReviewSubmitted,
    onPhotoUploaded,
}: PerfumeReviewModalProps) {
    const { token, user } = useAuth();
    const [score, setScore] = useState<number | null>(null);
    const [hoverScore, setHoverScore] = useState<number | null>(null);
    const [longevity, setLongevity] = useState<string>("");
    const [sillage, setSillage] = useState<string>("");
    const [priceValue, setPriceValue] = useState<string>("");
    const [genderOpinion, setGenderOpinion] = useState<string>("");
    const [seasons, setSeasons] = useState<string[]>([]);
    const [comment, setComment] = useState<string>("");

    // Photo upload states
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const toggleSeason = (val: string) => {
        setSeasons((prev) =>
            prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
        );
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhotoError(null);
        setPhotoSuccess(null);
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedPhoto(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setPhotoPreview(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            // 1. Submit review / voting criteria
            const hasCriteria =
                score !== null ||
                longevity ||
                sillage ||
                priceValue ||
                genderOpinion ||
                seasons.length > 0 ||
                comment.trim().length > 0;

            if (hasCriteria) {
                const res = await fetch(`${API_BASE}/api/perfumes/${slug}/review`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        score,
                        longevity: longevity || null,
                        sillage: sillage || null,
                        priceValue: priceValue || null,
                        genderOpinion: genderOpinion || null,
                        seasons: seasons.length > 0 ? seasons : null,
                        comment: comment.trim() || null,
                    }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || "Değerlendirme kaydedilemedi.");
                }
            }

            // 2. Submit photo if selected
            if (selectedPhoto) {
                setUploadingPhoto(true);
                const formData = new FormData();
                formData.append("photo", selectedPhoto);

                const photoRes = await fetch(`${API_BASE}/api/perfumes/${slug}/photos`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!photoRes.ok) {
                    const errData = await photoRes.json().catch(() => ({}));
                    throw new Error(errData.message || "Fotoğraf yüklenemedi.");
                }

                const photoData = await photoRes.json();
                if (onPhotoUploaded && photoData.photo) {
                    onPhotoUploaded(photoData.photo);
                }
            }

            setSuccessMessage("Değerlendirmeniz başarıyla kaydedildi!");
            if (onReviewSubmitted) onReviewSubmitted();

            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: any) {
            setError(err.message || "Bir hata oluştu.");
        } finally {
            setSubmitting(false);
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="review-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="review-modal-head">
                    <div>
                        <span className="eyebrow">Parfüm Değerlendirmesi</span>
                        <h2 className="modal-title">{perfumeName}</h2>
                    </div>
                    <button className="icon-btn" onClick={onClose} aria-label="Kapat">
                        <Icon name="close" size={16} />
                    </button>
                </div>

                {!token ? (
                    <div className="review-modal-login-prompt">
                        <div className="state">
                            <Icon name="user" size={32} />
                            <h3>Değerlendirme Yapmak İçin Giriş Yapın</h3>
                            <p>Parfüm puanı vermek, kalıcılık/silaj oylamak ve fotoğraf yüklemek için hesabınıza giriş yapmış olmanız gerekmektedir.</p>
                            <Link href="/giris" className="btn btn-primary" style={{ marginBlockStart: "1rem" }}>
                                Giriş Yap veya Kayıt Ol
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="review-modal-body" onSubmit={handleSubmitReview}>
                        {error && <div className="alert alert-error">{error}</div>}
                        {successMessage && <div className="alert alert-success">{successMessage}</div>}

                        {/* 1. Genel Puan */}
                        <div className="review-section">
                            <label className="review-section-title">1. Genel Puanınız (1 - 5 Yıldız)</label>
                            <div className="star-rating-picker">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        className={`star-pick-btn ${
                                            (hoverScore ?? score ?? 0) >= star ? "star-active" : ""
                                        }`}
                                        onMouseEnter={() => setHoverScore(star)}
                                        onMouseLeave={() => setHoverScore(null)}
                                        onClick={() => setScore(star)}
                                        aria-label={`${star} yıldız`}
                                    >
                                        <Icon name="star" size={24} filled={(hoverScore ?? score ?? 0) >= star} />
                                    </button>
                                ))}
                                {score && <span className="star-score-text">{score} / 5 Yıldız</span>}
                            </div>
                        </div>

                        {/* 2. Mevsimsel Tercih */}
                        <div className="review-section">
                            <label className="review-section-title">2. Hangi Mevsimlere Uygun?</label>
                            <div className="chip-picker-grid">
                                {SEASON_OPTS.map((s) => (
                                    <button
                                        type="button"
                                        key={s.value}
                                        className={`chip-opt-btn ${seasons.includes(s.value) ? "active" : ""}`}
                                        onClick={() => toggleSeason(s.value)}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Kalıcılık */}
                        <div className="review-section">
                            <label className="review-section-title">3. Kalıcılık (Teninizde Ne Kadar Kalıyor?)</label>
                            <div className="chip-picker-grid">
                                {LONGEVITY_OPTS.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        className={`chip-opt-btn ${longevity === opt.value ? "active" : ""}`}
                                        onClick={() => setLongevity(longevity === opt.value ? "" : opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Silaj (Farkedilirlik / Yayılım) */}
                        <div className="review-section">
                            <label className="review-section-title">4. Silaj / Yayılım (Çevredekiler Ne Kadar Hissediyor?)</label>
                            <div className="chip-picker-grid">
                                {SILLAGE_OPTS.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        className={`chip-opt-btn ${sillage === opt.value ? "active" : ""}`}
                                        onClick={() => setSillage(sillage === opt.value ? "" : opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 5. Fiyat / Değer Analizi */}
                        <div className="review-section">
                            <label className="review-section-title">5. Fiyat / Değer Analizi (Fiyatını Hak Ediyor mu?)</label>
                            <div className="chip-picker-grid">
                                {PRICE_OPTS.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        className={`chip-opt-btn ${priceValue === opt.value ? "active" : ""}`}
                                        onClick={() => setPriceValue(priceValue === opt.value ? "" : opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 6. Cinsiyet Algısı */}
                        <div className="review-section">
                            <label className="review-section-title">6. Cinsiyet Algısı (Kime Daha Uygun?)</label>
                            <div className="chip-picker-grid">
                                {GENDER_OPTS.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        className={`chip-opt-btn ${genderOpinion === opt.value ? "active" : ""}`}
                                        onClick={() => setGenderOpinion(genderOpinion === opt.value ? "" : opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 7. Kendi Fotoğrafını Ekle (AI Doğrulamalı) */}
                        <div className="review-section">
                            <label className="review-section-title">7. Parfüm Şişenizin Fotoğrafını Yükleyin</label>
                            <p className="section-hint">
                                Yüklediğiniz görsel yapay zeka tarafından incelenip onaylandığında parfümün galerisinde yayınlanacaktır.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                style={{ display: "none" }}
                            />
                            {photoPreview ? (
                                <div className="photo-preview-wrap">
                                    <img src={photoPreview} alt="Yüklenen Görsel" className="photo-preview-img" />
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setSelectedPhoto(null);
                                            setPhotoPreview(null);
                                        }}
                                    >
                                        Görseli Kaldır
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ width: "100%", justifyContent: "center", borderStyle: "dashed" }}
                                >
                                    <Icon name="plus" size={14} /> Fotoğraf Seç / Yükle
                                </button>
                            )}
                        </div>

                        {/* 8. Yorum */}
                        <div className="review-section">
                            <label className="review-section-title">8. Görüş ve Yorumunuz (İsteğe Bağlı)</label>
                            <textarea
                                className="review-textarea"
                                placeholder="Bu parfüm hakkındaki deneyimlerinizi, açılış ve dip notalardaki hislerinizi paylaşın…"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="review-modal-actions">
                            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                                Vazgeç
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? "Kaydediliyor…" : "Değerlendirmeyi Kaydet"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
