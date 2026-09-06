"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import PerfumeReviewModal from "./PerfumeReviewModal";

export default function PerfumeReviewButton({
    slug,
    perfumeName,
}: {
    slug: string;
    perfumeName: string;
}) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    return (
        <>
            <button
                type="button"
                className="btn btn-primary detail-review-btn"
                onClick={() => setOpen(true)}
            >
                <Icon name="star" size={14} /> Bu parfümü değerlendir
            </button>

            <PerfumeReviewModal
                slug={slug}
                perfumeName={perfumeName}
                isOpen={open}
                onClose={() => setOpen(false)}
                onReviewSubmitted={() => {
                    router.refresh();
                }}
            />
        </>
    );
}
