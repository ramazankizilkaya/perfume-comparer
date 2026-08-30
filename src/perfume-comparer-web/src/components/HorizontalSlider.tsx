"use client";

import { useRef, ReactNode } from "react";
import Link from "next/link";
import Icon from "./Icon";

interface HorizontalSliderProps {
    title: string;
    viewAllHref?: string;
    children: ReactNode;
}

export default function HorizontalSlider({
    title,
    viewAllHref,
    children,
}: HorizontalSliderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const container = scrollRef.current;
        const scrollAmount = container.clientWidth * 0.75;
        container.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    return (
        <section className="slider-section">
            <div className="slider-head">
                <h2 className="slider-title">{title}</h2>
                {viewAllHref && (
                    <Link href={viewAllHref} className="link-more">
                        Tümü <Icon name="arrow-right" size={13} />
                    </Link>
                )}
            </div>
            <div className="slider-wrapper">
                <button
                    type="button"
                    className="slider-side-nav slider-side-prev"
                    onClick={() => scroll("left")}
                    aria-label="Önceki"
                >
                    <Icon name="arrow-left" size={16} />
                </button>
                <div className="slider-track" ref={scrollRef}>
                    {children}
                </div>
                <button
                    type="button"
                    className="slider-side-nav slider-side-next"
                    onClick={() => scroll("right")}
                    aria-label="Sonraki"
                >
                    <Icon name="arrow-right" size={16} />
                </button>
            </div>
        </section>
    );
}
