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
        const items = Array.from(container.querySelectorAll<HTMLElement>(".slider-item"));
        if (items.length === 0) return;

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            if (direction === "right") {
                const nextItem = items.find((item) => {
                    const rect = item.getBoundingClientRect();
                    return rect.left + rect.width / 2 > containerCenter + 15;
                });
                if (nextItem) {
                    const rect = nextItem.getBoundingClientRect();
                    const delta = (rect.left + rect.width / 2) - containerCenter;
                    container.scrollBy({ left: delta, behavior: "smooth" });
                }
            } else {
                const prevItems = items.filter((item) => {
                    const rect = item.getBoundingClientRect();
                    return rect.left + rect.width / 2 < containerCenter - 15;
                });
                if (prevItems.length > 0) {
                    const prevItem = prevItems[prevItems.length - 1];
                    const rect = prevItem.getBoundingClientRect();
                    const delta = (rect.left + rect.width / 2) - containerCenter;
                    container.scrollBy({ left: delta, behavior: "smooth" });
                }
            }
        } else {
            if (direction === "right") {
                const nextItem = items.find((item) => {
                    const rect = item.getBoundingClientRect();
                    return rect.left > containerRect.left + 15;
                });
                if (nextItem) {
                    const rect = nextItem.getBoundingClientRect();
                    const delta = rect.left - containerRect.left;
                    container.scrollBy({ left: delta, behavior: "smooth" });
                }
            } else {
                const prevItems = items.filter((item) => {
                    const rect = item.getBoundingClientRect();
                    return rect.left < containerRect.left - 15;
                });
                if (prevItems.length > 0) {
                    const prevItem = prevItems[prevItems.length - 1];
                    const rect = prevItem.getBoundingClientRect();
                    const delta = rect.left - containerRect.left;
                    container.scrollBy({ left: delta, behavior: "smooth" });
                }
            }
        }
    };

    return (
        <section className="slider-section">
            <div className="slider-head">
                <div className="slider-heading">
                    <h2 className="slider-title">{title}</h2>
                </div>
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
