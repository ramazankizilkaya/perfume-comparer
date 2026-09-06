"use client";

import { useState } from "react";
import ImageLightboxModal from "./ImageLightboxModal";
import CompareButton from "./CompareButton";
import FavButton from "./FavButton";
import { mediaUrl } from "@/lib/urls";
import type { PerfumeRef } from "@/lib/stores";

const PLACEHOLDER =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800";

export default function PerfumeHeroMedia({ perfume }: { perfume: PerfumeRef }) {
    const [open, setOpen] = useState(false);
    const src = mediaUrl(perfume.imageUrl) || PLACEHOLDER;

    return (
        <div className="detail-media-col">
            <figure
                className="detail-media"
                onClick={() => setOpen(true)}
                title="Fotoğrafı büyütmek için tıklayın"
            >
                <img src={src} alt={perfume.name} />
                <div className="media-actions" onClick={(e) => e.stopPropagation()}>
                    <CompareButton perfume={perfume} />
                    <FavButton perfume={perfume} />
                </div>
            </figure>
            <ImageLightboxModal
                src={src}
                alt={perfume.name}
                isOpen={open}
                onClose={() => setOpen(false)}
            />
        </div>
    );
}
