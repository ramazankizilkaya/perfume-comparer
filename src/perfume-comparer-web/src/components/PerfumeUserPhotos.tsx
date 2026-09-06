"use client";

import { useState } from "react";
import Icon from "./Icon";
import ImageLightboxModal from "./ImageLightboxModal";
import PerfumeReviewModal from "./PerfumeReviewModal";
import { mediaUrl } from "@/lib/urls";

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800";

export interface UserPhoto {
    id: number;
    imageUrl: string;
    authorName: string;
    createdAt: string;
}

export default function PerfumeUserPhotos({
    slug,
    perfumeName,
    initialPhotos,
}: {
    slug: string;
    perfumeName: string;
    initialPhotos: UserPhoto[];
}) {
    const [photos, setPhotos] = useState<UserPhoto[]>(initialPhotos);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState("");
    const [lightboxAlt, setLightboxAlt] = useState("");
    const [reviewModalOpen, setReviewModalOpen] = useState(false);

    if (photos.length === 0) return null;

    return (
        <section className="block user-photos-section">
            <div className="block-title-row">
                <h2 className="block-title">Kullanıcılardan gelen fotoğraflar ({photos.length})</h2>
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setReviewModalOpen(true)}
                >
                    <Icon name="plus" size={12} /> Fotoğraf ekle
                </button>
            </div>
            <div className="user-photos-slider">
                {photos.map((photo) => (
                    <div
                        key={photo.id}
                        className="user-photo-card"
                        onClick={() => {
                            setLightboxSrc(mediaUrl(photo.imageUrl) || PLACEHOLDER);
                            setLightboxAlt(`${perfumeName} - @${photo.authorName}`);
                            setLightboxOpen(true);
                        }}
                        title={`@${photo.authorName} tarafından yüklendi. Büyütmek için tıklayın.`}
                    >
                        <img
                            src={mediaUrl(photo.imageUrl)}
                            alt={photo.authorName}
                            className="user-photo-img"
                            loading="lazy"
                        />
                        <span className="user-photo-author">@{photo.authorName}</span>
                    </div>
                ))}
            </div>

            <ImageLightboxModal
                src={lightboxSrc}
                alt={lightboxAlt}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />

            <PerfumeReviewModal
                slug={slug}
                perfumeName={perfumeName}
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onPhotoUploaded={(photo) => {
                    setPhotos((prev) => [photo, ...prev]);
                }}
            />
        </section>
    );
}
