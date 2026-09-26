"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import PerfumeReviewModal from "./PerfumeReviewModal";
import { useAuth } from "@/lib/stores";
import { API_BASE } from "@/lib/urls";

export default function PerfumeReviewButton({
    slug,
    perfumeName,
}: {
    slug: string;
    perfumeName: string;
}) {
    const [open, setOpen] = useState(false);
    const [hasEvaluated, setHasEvaluated] = useState(false);
    const { token } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!token) return;

        let isMounted = true;
        fetch(`${API_BASE}/api/perfumes/${slug}/my-evaluation`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-Requested-With": "XMLHttpRequest",
            },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (isMounted && data?.hasEvaluated) {
                    setHasEvaluated(true);
                }
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, [slug, token]);

    if (token && hasEvaluated) {
        return (
            <button
                type="button"
                className="btn btn-secondary detail-review-btn is-reviewed"
                disabled
                title="Bu parfümü daha önce değerlendirdiniz."
            >
                <Icon name="check" size={14} /> Değerlendirildi
            </button>
        );
    }

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
                isAlreadyEvaluated={Boolean(token && hasEvaluated)}
                onClose={() => setOpen(false)}
                onReviewSubmitted={() => {
                    setHasEvaluated(true);
                    router.refresh();
                }}
            />
        </>
    );
}
